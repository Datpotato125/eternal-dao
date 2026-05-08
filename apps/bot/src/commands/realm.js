import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { supabase } from '../db/supabase.js';
import { REALMS, getRealm } from '@eternal-dao/shared';

export default {
  data: new SlashCommandBuilder()
    .setName('realm')
    .setDescription('View the realm progression ladder and your current standing.'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const { data: char } = await supabase
      .from('characters')
      .select('realm_level, qi_current, qi_max')
      .eq('player_id', interaction.user.id)
      .eq('server_id', interaction.guildId)
      .maybeSingle();

    const currentLevel = char?.realm_level ?? null;

    const lines = REALMS.map(realm => {
      const isCurrent = realm.id === currentLevel;
      const isPast    = currentLevel !== null && realm.id < currentLevel;

      let icon;
      if (isCurrent) icon = '▶️';
      else if (isPast) icon = '✅';
      else icon = '⬜';

      const qiReq = realm.min_qi > 0 ? `${realm.min_qi.toLocaleString()} Qi` : 'Starting realm';
      const label = isCurrent ? `**${realm.name}**` : realm.name;

      let suffix = '';
      if (isCurrent && char) {
        const pct = Math.floor((Number(char.qi_current) / Number(char.qi_max)) * 100);
        suffix = ` — ${pct}% to breakthrough`;
      }

      return `${icon} ${label} — ${qiReq}${suffix}`;
    });

    const embed = new EmbedBuilder()
      .setColor(0x7e57c2)
      .setTitle('📿 Realm Progression')
      .setDescription(lines.join('\n'))
      .setFooter({ text: char ? `You are in realm ${currentLevel} of 10` : 'Use /register to begin your journey.' });

    await interaction.editReply({ embeds: [embed] });
  },
};
