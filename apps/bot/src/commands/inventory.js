import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { supabase } from '../db/supabase.js';

const RARITY_COLORS = {
  common:    '⬜',
  uncommon:  '🟩',
  rare:      '🟦',
  epic:      '🟪',
  legendary: '🟧',
};

export default {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('View the items in your possession.'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const discordId = interaction.user.id;
    const serverId  = interaction.guildId;

    // Get character id first
    const { data: char, error: charErr } = await supabase
      .from('characters')
      .select('id')
      .eq('player_id', discordId)
      .eq('server_id', serverId)
      .maybeSingle();

    if (charErr) throw charErr;
    if (!char) {
      return interaction.editReply('You have no character in this realm. Use `/register` to begin.');
    }

    const { data: items, error: invErr } = await supabase
      .from('inventory')
      .select('quantity, items(name, type, rarity, effect_json)')
      .eq('character_id', char.id)
      .order('acquired_at', { ascending: false });

    if (invErr) throw invErr;

    if (!items || items.length === 0) {
      return interaction.editReply('Your inventory is empty. Defeat bosses and complete quests to earn items.');
    }

    const lines = items.map(row => {
      const item   = row.items;
      const icon   = RARITY_COLORS[item.rarity] ?? '⬜';
      const qty    = row.quantity > 1 ? ` ×${row.quantity}` : '';
      return `${icon} **${item.name}**${qty} — *${item.type}*`;
    });

    const embed = new EmbedBuilder()
      .setColor(0x8d6e63)
      .setTitle(`🎒 ${interaction.user.username}'s Inventory`)
      .setDescription(lines.join('\n'))
      .setFooter({ text: `${items.length} item type${items.length !== 1 ? 's' : ''}` });

    await interaction.editReply({ embeds: [embed] });
  },
};
