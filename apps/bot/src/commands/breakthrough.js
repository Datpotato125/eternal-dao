import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { supabase } from '../db/supabase.js';
import { REALMS, getRealm, calculateOfflineQi } from '@eternal-dao/shared';
import { addFlavorText } from '../utils/groq.js';

const BREAKTHROUGH_CHANCE = 0.75;
const FAILURE_QI_LOSS_PCT  = 0.25; // lose 25% of qi_max on failure

export default {
  data: new SlashCommandBuilder()
    .setName('breakthrough')
    .setDescription('Attempt to break through to the next realm.'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const discordId = interaction.user.id;
    const serverId  = interaction.guildId;

    const { data: char, error } = await supabase
      .from('characters')
      .select('id, qi_current, qi_max, realm_level, cultivation_rate, cultivation_started_at, breakthrough_attempts')
      .eq('player_id', discordId)
      .eq('server_id', serverId)
      .maybeSingle();

    if (error) throw error;
    if (!char) {
      return interaction.editReply('You have not begun your journey yet. Use `/register` first.');
    }

    const now    = Date.now();
    const qiMax  = Number(char.qi_max);
    let qiCurrent = Number(char.qi_current);

    // Auto-claim any active cultivation session before attempting breakthrough
    if (char.cultivation_started_at) {
      const gained = calculateOfflineQi(
        char.cultivation_rate,
        new Date(char.cultivation_started_at).getTime(),
        now
      );
      qiCurrent = Math.min(qiCurrent + gained, qiMax);
      await supabase
        .from('characters')
        .update({ qi_current: qiCurrent, cultivation_started_at: null })
        .eq('id', char.id);
    }

    const currentRealm = getRealm(char.realm_level);

    if (char.realm_level >= 10) {
      return interaction.editReply('You stand at the pinnacle of all cultivation. No higher realm exists.');
    }

    if (qiCurrent < qiMax) {
      const pct = Math.floor((qiCurrent / qiMax) * 100);
      return interaction.editReply(
        `Your Qi is not yet sufficient.\n\n` +
        `**${currentRealm.name}** — ${qiCurrent.toLocaleString()} / ${qiMax.toLocaleString()} Qi (${pct}%)\n` +
        `You need **${(qiMax - qiCurrent).toLocaleString()}** more Qi before you can attempt a breakthrough.`
      );
    }

    const success       = Math.random() < BREAKTHROUGH_CHANCE;
    const newRealmLevel = char.realm_level + 1;
    const nextRealm     = getRealm(newRealmLevel);

    if (success) {
      // New qi_max = the threshold to fill at the new realm (next realm's min_qi)
      const realmBeyondNext = REALMS.find(r => r.id === newRealmLevel + 1);
      const newQiMax = realmBeyondNext ? realmBeyondNext.min_qi : 999_999_999;

      await supabase
        .from('characters')
        .update({
          realm_level:           newRealmLevel,
          qi_current:            0,
          qi_max:                newQiMax,
          breakthrough_attempts: 0,
          last_seen:             new Date(now).toISOString(),
        })
        .eq('id', char.id);

      // Public announcement to the channel
      await interaction.followUp({
        content: `⚡ **${interaction.user.username}** has shattered the boundaries of **${currentRealm.name}** and ascended to **${nextRealm.name}**!`,
      });

      const embed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle('⚡ Breakthrough Success!')
        .setDescription(`The heavens tremble. You have transcended **${currentRealm.name}**.`)
        .addFields(
          { name: 'New Realm',  value: `**${nextRealm.name}**`,               inline: true },
          { name: 'Qi',         value: `0 / ${newQiMax.toLocaleString()}`,     inline: true },
        )
        .setFooter({ text: 'Use /cultivate to begin accumulating Qi in your new realm.' });

      await interaction.editReply({ embeds: [embed] });
      addFlavorText(interaction, embed,
        `${interaction.user.username} has just shattered the boundary of ${currentRealm.name} and ascended to ${nextRealm.name}. Narrate this dramatic breakthrough with heavenly tribulation imagery.`
      );
      return;
    }

    // ── Failure ───────────────────────────────────────────────
    const qiLost   = Math.floor(qiMax * FAILURE_QI_LOSS_PCT);
    const newQi    = qiCurrent - qiLost;
    const attempts = Number(char.breakthrough_attempts) + 1;

    await supabase
      .from('characters')
      .update({
        qi_current:            newQi,
        breakthrough_attempts: attempts,
        last_seen:             new Date(now).toISOString(),
      })
      .eq('id', char.id);

    const embed = new EmbedBuilder()
      .setColor(0xef5350)
      .setTitle('💔 Breakthrough Failed')
      .setDescription('The heavenly tribulation overwhelms you. Your Qi destabilizes and partially dissipates.')
      .addFields(
        { name: 'Realm',     value: currentRealm.name,                                            inline: true },
        { name: 'Qi Lost',   value: `-${qiLost.toLocaleString()}`,                                inline: true },
        { name: 'Remaining', value: `${newQi.toLocaleString()} / ${qiMax.toLocaleString()}`,      inline: true },
        { name: 'Attempts',  value: String(attempts),                                             inline: true },
      )
      .setFooter({ text: 'Continue cultivating and try again.' });

    await interaction.editReply({ embeds: [embed] });
    addFlavorText(interaction, embed,
      `${interaction.user.username} at the ${currentRealm.name} realm failed their breakthrough attempt (attempt ${attempts}). The heavenly tribulation overwhelmed them and they lost ${qiLost.toLocaleString()} Qi. Narrate their failure briefly.`
    );
    return;
  },
};
