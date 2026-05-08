import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { supabase } from '../db/supabase.js';
import { getRealm } from '@eternal-dao/shared';

// ── helpers ──────────────────────────────────────────────────────────────────

async function getCharacter(discordId, serverId) {
  const { data, error } = await supabase
    .from('characters')
    .select('id, realm_level, titles')
    .eq('player_id', discordId)
    .eq('server_id', serverId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getMembership(characterId) {
  const { data, error } = await supabase
    .from('sect_members')
    .select('sect_id, role, sects(id, name, leader_id)')
    .eq('character_id', characterId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ── subcommand handlers ───────────────────────────────────────────────────────

async function handleCreate(interaction, char) {
  const name     = interaction.options.getString('name').trim();
  const serverId = interaction.guildId;

  if (name.length < 2 || name.length > 32) {
    return interaction.editReply('Sect name must be between 2 and 32 characters.');
  }

  // Check already in a sect
  const existing = await getMembership(char.id);
  if (existing) {
    return interaction.editReply(`You already belong to **${existing.sects.name}**. Leave it first with \`/sect leave\`.`);
  }

  // Check name taken in this server
  const { data: taken } = await supabase
    .from('sects')
    .select('id')
    .eq('server_id', serverId)
    .ilike('name', name)
    .maybeSingle();
  if (taken) return interaction.editReply(`A sect named **${name}** already exists in this realm.`);

  // Founding Ancestor check — first sect ever in this server
  const { count } = await supabase
    .from('sects')
    .select('id', { count: 'exact', head: true })
    .eq('server_id', serverId);
  const isFoundingAncestor = count === 0;

  // Create sect
  const { data: sect, error } = await supabase
    .from('sects')
    .insert({ server_id: serverId, name, leader_id: char.id, member_count: 1 })
    .select('id')
    .single();
  if (error) throw error;

  // Add leader as sect_master
  await supabase.from('sect_members').insert({
    sect_id: sect.id, character_id: char.id, role: 'sect_master',
  });

  // Grant Founding Ancestor title if first sect in server
  const titles = char.titles ?? [];
  if (isFoundingAncestor && !titles.includes('Founding Ancestor')) {
    await supabase
      .from('characters')
      .update({ titles: [...titles, 'Founding Ancestor'] })
      .eq('id', char.id);
  }

  const embed = new EmbedBuilder()
    .setColor(isFoundingAncestor ? 0xff9800 : 0x43a047)
    .setTitle(isFoundingAncestor ? '🌅 The First Sect Rises' : '🏯 Sect Founded')
    .setDescription(
      isFoundingAncestor
        ? `**${interaction.user.username}** has founded **${name}** — the first sect in this realm.\nThey are forever known as a **Founding Ancestor**.`
        : `**${interaction.user.username}** has founded **${name}**.`
    )
    .addFields(
      { name: 'Sect',  value: name,           inline: true },
      { name: 'Role',  value: 'Sect Master',  inline: true },
    )
    .setFooter({ text: 'Others can join with /sect join' });

  return interaction.editReply({ embeds: [embed] });
}

async function handleJoin(interaction, char) {
  const name     = interaction.options.getString('name').trim();
  const serverId = interaction.guildId;

  // Check already in a sect
  const existing = await getMembership(char.id);
  if (existing) {
    return interaction.editReply(`You already belong to **${existing.sects.name}**. Leave it first with \`/sect leave\`.`);
  }

  // Find sect by name
  const { data: sect, error } = await supabase
    .from('sects')
    .select('id, name, member_count')
    .eq('server_id', serverId)
    .ilike('name', name)
    .maybeSingle();
  if (error) throw error;
  if (!sect) return interaction.editReply(`No sect named **${name}** exists in this realm.`);

  await Promise.all([
    supabase.from('sect_members').insert({ sect_id: sect.id, character_id: char.id, role: 'disciple' }),
    supabase.from('sects').update({ member_count: sect.member_count + 1 }).eq('id', sect.id),
  ]);

  const embed = new EmbedBuilder()
    .setColor(0x1e88e5)
    .setTitle('🤝 Sect Joined')
    .setDescription(`**${interaction.user.username}** has joined **${sect.name}** as a Disciple.`)
    .setFooter({ text: 'Prove your worth to rise through the ranks.' });

  return interaction.editReply({ embeds: [embed] });
}

async function handleLeave(interaction, char) {
  const membership = await getMembership(char.id);
  if (!membership) {
    return interaction.editReply('You are not a member of any sect.');
  }

  const sect = membership.sects;

  // Prevent leader from leaving without disbanding
  if (membership.role === 'sect_master') {
    return interaction.editReply(
      `You are the Sect Master of **${sect.name}**. Disband the sect or transfer leadership before leaving.\n*(Leadership transfer coming soon.)*`
    );
  }

  await Promise.all([
    supabase.from('sect_members').delete()
      .eq('sect_id', sect.id).eq('character_id', char.id),
    supabase.from('sects')
      .update({ member_count: Math.max((await supabase.from('sects').select('member_count').eq('id', sect.id).single()).data.member_count - 1, 0) })
      .eq('id', sect.id),
  ]);

  const embed = new EmbedBuilder()
    .setColor(0x757575)
    .setTitle('🚪 Left Sect')
    .setDescription(`**${interaction.user.username}** has left **${sect.name}**.`);

  return interaction.editReply({ embeds: [embed] });
}

async function handleInfo(interaction, char) {
  const nameArg  = interaction.options.getString('name');
  const serverId = interaction.guildId;
  let sect;

  if (nameArg) {
    const { data, error } = await supabase
      .from('sects')
      .select('id, name, description, member_count, created_at')
      .eq('server_id', serverId)
      .ilike('name', nameArg.trim())
      .maybeSingle();
    if (error) throw error;
    if (!data) return interaction.editReply(`No sect named **${nameArg}** found in this realm.`);
    sect = data;
  } else {
    // Show the user's own sect
    if (!char) return interaction.editReply('You have no character here. Use `/register` first.');
    const membership = await getMembership(char.id);
    if (!membership) return interaction.editReply('You are not in a sect. Use `/sect join <name>` to join one.');
    const { data, error } = await supabase
      .from('sects')
      .select('id, name, description, member_count, created_at')
      .eq('id', membership.sect_id)
      .single();
    if (error) throw error;
    sect = data;
  }

  // Fetch members with character and player info
  const { data: members } = await supabase
    .from('sect_members')
    .select('role, characters(realm_level, player_id, players(username))')
    .eq('sect_id', sect.id)
    .order('role');

  const ROLE_RANK = { sect_master: 0, ancestor: 1, elder: 2, disciple: 3 };
  const sorted = (members ?? []).sort((a, b) => (ROLE_RANK[a.role] ?? 9) - (ROLE_RANK[b.role] ?? 9));

  const memberLines = sorted.map(m => {
    const username = m.characters?.players?.username ?? 'Unknown';
    const realm    = getRealm(m.characters?.realm_level ?? 1);
    const roleLabel = m.role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
    return `• **${username}** — ${realm.name} *(${roleLabel})*`;
  });

  const embed = new EmbedBuilder()
    .setColor(0x6d4c41)
    .setTitle(`🏯 ${sect.name}`)
    .addFields(
      { name: 'Members', value: `${sect.member_count}`,                  inline: true },
      { name: 'Founded', value: new Date(sect.created_at).toLocaleDateString(), inline: true },
    );

  if (sect.description) embed.setDescription(sect.description);

  if (memberLines.length > 0) {
    embed.addFields({ name: 'Roster', value: memberLines.join('\n') });
  }

  return interaction.editReply({ embeds: [embed] });
}

// ── command definition ────────────────────────────────────────────────────────

export default {
  data: new SlashCommandBuilder()
    .setName('sect')
    .setDescription('Manage or view sects.')
    .addSubcommand(sub => sub
      .setName('create')
      .setDescription('Found a new sect.')
      .addStringOption(opt => opt.setName('name').setDescription('Name of your sect.').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('join')
      .setDescription('Join an existing sect.')
      .addStringOption(opt => opt.setName('name').setDescription('Name of the sect to join.').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('leave')
      .setDescription('Leave your current sect.')
    )
    .addSubcommand(sub => sub
      .setName('info')
      .setDescription('View a sect\'s details.')
      .addStringOption(opt => opt.setName('name').setDescription('Sect name (leave blank for your own).').setRequired(false))
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const serverId = interaction.guildId;
    const sub      = interaction.options.getSubcommand();

    // Most subcommands need the user's character
    const char = await (async () => {
      const { data } = await supabase
        .from('characters')
        .select('id, realm_level, titles')
        .eq('player_id', interaction.user.id)
        .eq('server_id', serverId)
        .maybeSingle();
      return data;
    })();

    if (sub !== 'info' && !char) {
      return interaction.editReply('You have no character in this realm. Use `/register` first.');
    }

    switch (sub) {
      case 'create': return handleCreate(interaction, char);
      case 'join':   return handleJoin(interaction, char);
      case 'leave':  return handleLeave(interaction, char);
      case 'info':   return handleInfo(interaction, char);
    }
  },
};
