import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { supabase } from '../db/supabase.js';
import { getRealm, SPIRIT_ROOTS, calculateOfflineQi } from '@eternal-dao/shared';

function qiBar(current, max, length = 14) {
  const filled = Math.min(Math.round((current / max) * length), length);
  return '█'.repeat(filled) + '░'.repeat(length - filled);
}

const ROOT_LABEL = Object.fromEntries(SPIRIT_ROOTS.map(r => [r.id, r.label]));

export default {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View your character stats.')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('View another cultivator\'s stats (leave blank for yours).')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const serverId  = interaction.guildId;
    const target    = interaction.options.getUser('user') ?? interaction.user;

    const { data: char, error } = await supabase
      .from('characters')
      .select('*, players(username, avatar_url)')
      .eq('player_id', target.id)
      .eq('server_id', serverId)
      .maybeSingle();

    if (error) throw error;
    if (!char) {
      const isSelf = target.id === interaction.user.id;
      return interaction.editReply(
        isSelf
          ? 'You have no character in this realm. Use `/register` to begin.'
          : `${target.username} has not registered in this realm.`
      );
    }

    const now     = Date.now();
    const realm   = getRealm(char.realm_level);
    let qiCurrent = Number(char.qi_current);
    const qiMax   = Number(char.qi_max);

    // Show live Qi (include any in-progress cultivation)
    if (char.cultivation_started_at) {
      const gained = calculateOfflineQi(
        char.cultivation_rate,
        new Date(char.cultivation_started_at).getTime(),
        now
      );
      qiCurrent = Math.min(qiCurrent + gained, qiMax);
    }

    const bar         = qiBar(qiCurrent, qiMax);
    const isCultivating = !!char.cultivation_started_at;
    const isFull      = qiCurrent >= qiMax;
    const pct         = Math.floor((qiCurrent / qiMax) * 100);
    const rootLabel   = ROOT_LABEL[char.spirit_root] ?? char.spirit_root;

    const embed = new EmbedBuilder()
      .setColor(0x7e57c2)
      .setTitle(`📜 ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: 'Realm',          value: realm.name,                                  inline: true  },
        { name: 'Spirit Root',    value: rootLabel,                                   inline: true  },
        { name: '​',         value: '​',                                  inline: true  },
        { name: 'Qi',             value: `${bar}\n${qiCurrent.toLocaleString()} / ${qiMax.toLocaleString()} (${pct}%)` },
        { name: 'Cultivation',    value: isCultivating ? `🧘 Meditating — ${char.cultivation_rate} Qi/hr` : `⏸ Idle — ${char.cultivation_rate} Qi/hr`, inline: true },
        { name: 'Status',         value: isFull ? '⚡ Ready for Breakthrough' : '📈 Cultivating', inline: true },
        { name: 'PvP Record',     value: `${char.pvp_wins ?? 0}W / ${char.pvp_losses ?? 0}L`,   inline: true },
      )
      .setFooter({ text: `Breakthrough attempts: ${char.breakthrough_attempts ?? 0}` });

    await interaction.editReply({ embeds: [embed] });
  },
};
