import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { supabase } from '../db/supabase.js';
import { getRealm } from '@eternal-dao/shared';

const MEDALS = ['🥇', '🥈', '🥉'];

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Top cultivators ranked by realm and Qi.')
    .addStringOption(opt =>
      opt.setName('scope')
        .setDescription('Server leaderboard or global across all servers.')
        .setRequired(false)
        .addChoices(
          { name: 'Server (default)', value: 'server' },
          { name: 'Global',           value: 'global'  },
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const scope    = interaction.options.getString('scope') ?? 'server';
    const serverId = interaction.guildId;

    let query = supabase
      .from('characters')
      .select('player_id, realm_level, qi_current, qi_max, spirit_root, pvp_wins, pvp_losses, players(username)')
      .order('realm_level', { ascending: false })
      .order('qi_current',  { ascending: false })
      .limit(10);

    if (scope === 'server') {
      query = query.eq('server_id', serverId);
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    if (!rows || rows.length === 0) {
      return interaction.editReply('No cultivators found. Be the first to `/register`!');
    }

    const lines = rows.map((char, i) => {
      const rank     = MEDALS[i] ?? `**${i + 1}.**`;
      const realm    = getRealm(char.realm_level);
      const username = char.players?.username ?? 'Unknown';
      const pvp      = `${char.pvp_wins ?? 0}W/${char.pvp_losses ?? 0}L`;
      return `${rank} **${username}** — ${realm.name} | ${Number(char.qi_current).toLocaleString()} Qi | ${pvp}`;
    });

    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle(scope === 'global' ? '🌐 Global Leaderboard' : '🏯 Server Leaderboard')
      .setDescription(lines.join('\n'))
      .setFooter({ text: `Top ${rows.length} cultivator${rows.length !== 1 ? 's' : ''}` });

    await interaction.editReply({ embeds: [embed] });
  },
};
