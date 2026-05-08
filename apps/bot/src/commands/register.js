import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { supabase } from '../db/supabase.js';
import { SPIRIT_ROOTS, BASE_CULTIVATION_RATE } from '@eternal-dao/shared';

// Weighted spirit root roll — weights sum to 100
const SPIRIT_ROOT_WEIGHTS = [
  { id: 'mortal', weight: 50 },
  { id: 'wood',   weight: 8  },
  { id: 'fire',   weight: 8  },
  { id: 'water',  weight: 8  },
  { id: 'metal',  weight: 8  },
  { id: 'earth',  weight: 8  },
  { id: 'dual',   weight: 8  },
  { id: 'chaos',  weight: 2  },
];

function rollSpiritRoot() {
  let roll = Math.random() * 100;
  for (const { id, weight } of SPIRIT_ROOT_WEIGHTS) {
    roll -= weight;
    if (roll <= 0) return id;
  }
  return 'mortal';
}

const RARITY_COLORS = {
  common:    0x9e9e9e,
  uncommon:  0x4caf50,
  rare:      0x2196f3,
  legendary: 0xff9800,
};

const RARITY_LABELS = {
  common:    'Common',
  uncommon:  'Uncommon',
  rare:      'Rare',
  legendary: 'Legendary ✦',
};

export default {
  data: new SlashCommandBuilder()
    .setName('register')
    .setDescription('Begin your cultivation journey in this realm.'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const discordId = interaction.user.id;
    const serverId  = interaction.guildId;
    const username  = interaction.user.username;
    const avatarUrl = interaction.user.displayAvatarURL();

    // One character per player per server
    const { data: existing } = await supabase
      .from('characters')
      .select('id')
      .eq('player_id', discordId)
      .eq('server_id', serverId)
      .maybeSingle();

    if (existing) {
      return interaction.editReply(
        'You already walk the path of cultivation in this realm. Use `/stats` to view your progress.'
      );
    }

    // Upsert global player record
    await supabase.from('players').upsert(
      { discord_id: discordId, username, avatar_url: avatarUrl, last_seen: new Date().toISOString() },
      { onConflict: 'discord_id' }
    );

    // Roll spirit root and compute cultivation rate
    const rootId = rollSpiritRoot();
    const spiritRoot = SPIRIT_ROOTS.find(r => r.id === rootId);
    const cultivationRate = Math.floor(BASE_CULTIVATION_RATE * spiritRoot.cultivation_bonus);

    // Create character for this server
    const { error } = await supabase.from('characters').insert({
      player_id:        discordId,
      server_id:        serverId,
      realm_level:      1,
      qi_current:       0,
      qi_max:           1000,
      cultivation_rate: cultivationRate,
      spirit_root:      rootId,
    });

    if (error) throw error;

    const embed = new EmbedBuilder()
      .setTitle('✨ A New Cultivator Emerges')
      .setColor(RARITY_COLORS[spiritRoot.rarity])
      .setDescription(`**${username}** has taken their first step onto the Eternal Dao.`)
      .addFields(
        { name: 'Realm',             value: 'Mortal Refinement',                                        inline: true },
        { name: 'Spirit Root',       value: `${spiritRoot.label} — *${RARITY_LABELS[spiritRoot.rarity]}*`, inline: true },
        { name: '​',            value: '​',                                                   inline: true },
        { name: 'Qi',                value: '0 / 1,000',                                               inline: true },
        { name: 'Cultivation Rate',  value: `${cultivationRate} Qi/hr`,                                inline: true },
      )
      .setThumbnail(avatarUrl)
      .setFooter({ text: 'Use /cultivate to begin accumulating Qi.' });

    await interaction.editReply({ embeds: [embed] });
  },
};
