import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { supabase } from '../db/supabase.js';
import { calculateOfflineQi, getRealm } from '@eternal-dao/shared';
import { addFlavorText } from '../utils/groq.js';

function qiBar(current, max, length = 12) {
  const filled = Math.min(Math.round((current / max) * length), length);
  return '█'.repeat(filled) + '░'.repeat(length - filled);
}

function formatElapsed(ms) {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default {
  data: new SlashCommandBuilder()
    .setName('cultivate')
    .setDescription('Begin or end your meditation session to accumulate Qi.'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const discordId = interaction.user.id;
    const serverId  = interaction.guildId;

    const { data: char, error } = await supabase
      .from('characters')
      .select('id, qi_current, qi_max, cultivation_rate, realm_level, cultivation_started_at')
      .eq('player_id', discordId)
      .eq('server_id', serverId)
      .maybeSingle();

    if (error) throw error;
    if (!char) {
      return interaction.editReply('You have not begun your journey yet. Use `/register` first.');
    }

    const now = Date.now();

    // ── START cultivation ─────────────────────────────────────
    if (!char.cultivation_started_at) {
      await supabase
        .from('characters')
        .update({
          cultivation_started_at: new Date(now).toISOString(),
          last_seen: new Date(now).toISOString(),
        })
        .eq('id', char.id);

      await supabase
        .from('players')
        .update({ last_seen: new Date(now).toISOString() })
        .eq('discord_id', discordId);

      const realm = getRealm(char.realm_level);
      const bar   = qiBar(Number(char.qi_current), Number(char.qi_max));

      const embed = new EmbedBuilder()
        .setColor(0x5c6bc0)
        .setTitle('🧘 Meditation Begun')
        .setDescription('You close your eyes and sink into the flow of Heaven and Earth. Qi slowly fills your dantian.')
        .addFields(
          { name: 'Realm',          value: realm.name,                                                              inline: true },
          { name: 'Rate',           value: `${char.cultivation_rate} Qi/hr`,                                       inline: true },
          { name: 'Current Qi',     value: `${bar}\n${Number(char.qi_current).toLocaleString()} / ${Number(char.qi_max).toLocaleString()}` },
        )
        .setFooter({ text: 'Use /cultivate again to end your session and claim your Qi.' });

      await interaction.editReply({ embeds: [embed] });
      addFlavorText(interaction, embed,
        `A cultivator named ${interaction.user.username} with a ${char.spirit_root} spirit root begins meditating at the ${realm.name} realm. Narrate the moment they sink into cultivation.`
      );
      return;
    }

    // ── STOP & CLAIM ──────────────────────────────────────────
    const startedAt = new Date(char.cultivation_started_at).getTime();
    const elapsed   = now - startedAt;
    const qiGained  = calculateOfflineQi(char.cultivation_rate, startedAt, now);
    const qiCurrent = Number(char.qi_current);
    const qiMax     = Number(char.qi_max);
    const newQi     = Math.min(qiCurrent + qiGained, qiMax);
    const gained    = newQi - qiCurrent;
    const isFull    = newQi >= qiMax;

    await supabase
      .from('characters')
      .update({
        qi_current:            newQi,
        cultivation_started_at: null,
        last_seen:             new Date(now).toISOString(),
      })
      .eq('id', char.id);

    await supabase
      .from('players')
      .update({ last_seen: new Date(now).toISOString() })
      .eq('discord_id', discordId);

    const realm = getRealm(char.realm_level);
    const bar   = qiBar(newQi, qiMax);

    const embed = new EmbedBuilder()
      .setColor(isFull ? 0xffd700 : 0x26a69a)
      .setTitle('✅ Meditation Complete')
      .addFields(
        { name: 'Realm',           value: realm.name,                                                               inline: true },
        { name: 'Session Length',  value: formatElapsed(elapsed),                                                   inline: true },
        { name: 'Rate',            value: `${char.cultivation_rate} Qi/hr`,                                        inline: true },
        { name: 'Qi Gained',       value: `**+${gained.toLocaleString()}**`,                                       inline: true },
        { name: 'Progress',        value: `${bar}\n${newQi.toLocaleString()} / ${qiMax.toLocaleString()}` },
      );

    if (isFull) {
      embed.addFields({
        name:  '⚡ Qi Saturated',
        value: 'Your dantian is full. Use `/breakthrough` to attempt ascension.',
      });
    } else {
      embed.setFooter({ text: 'Use /cultivate to begin your next session.' });
    }

    await interaction.editReply({ embeds: [embed] });
    addFlavorText(interaction, embed,
      `A cultivator named ${interaction.user.username} at the ${realm.name} realm emerges from ${formatElapsed(elapsed)} of meditation, having absorbed ${gained.toLocaleString()} Qi. Narrate their emergence.`
    );
  },
};
