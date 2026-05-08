import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { supabase } from '../db/supabase.js';
import { resolveCombat, generateCombatSeed, calculateOfflineQi, getRealm } from '@eternal-dao/shared';
import { addFlavorText } from '../utils/groq.js';

const QI_WIN_PCT  = 0.15; // winner gains 15% of their qi_max
const QI_LOSE_PCT = 0.10; // loser  loses 10% of their qi_max

// Build a compact round-by-round indicator string
// e.g. 🔴🔵🔴🔴🔵🔴  (attacker=🔴, defender=🔵)
function roundBar(log) {
  return log.map(r => r.winner === 'attacker' ? '🔴' : '🔵').join('');
}

// Auto-claim any active cultivation session and return updated qi_current
async function claimCultivation(char, now) {
  if (!char.cultivation_started_at) return Number(char.qi_current);
  const gained = calculateOfflineQi(
    char.cultivation_rate,
    new Date(char.cultivation_started_at).getTime(),
    now
  );
  const newQi = Math.min(Number(char.qi_current) + gained, Number(char.qi_max));
  await supabase
    .from('characters')
    .update({ qi_current: newQi, cultivation_started_at: null })
    .eq('id', char.id);
  return newQi;
}

export default {
  data: new SlashCommandBuilder()
    .setName('fight')
    .setDescription('Challenge another cultivator to combat.')
    .addUserOption(opt =>
      opt.setName('target')
        .setDescription('The cultivator to challenge.')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply(); // public — fights are visible to the whole channel

    const serverId    = interaction.guildId;
    const attackerUser = interaction.user;
    const defenderUser = interaction.options.getUser('target');

    // Basic validation
    if (defenderUser.bot) {
      return interaction.editReply('You cannot challenge a bot to combat.');
    }
    if (defenderUser.id === attackerUser.id) {
      return interaction.editReply('You cannot challenge yourself.');
    }

    // Fetch both characters
    const { data: chars, error } = await supabase
      .from('characters')
      .select('id, player_id, realm_level, qi_current, qi_max, cultivation_rate, spirit_root, cultivation_started_at, pvp_wins, pvp_losses')
      .eq('server_id', serverId)
      .in('player_id', [attackerUser.id, defenderUser.id]);

    if (error) throw error;

    const attackerChar = chars?.find(c => c.player_id === attackerUser.id);
    const defenderChar = chars?.find(c => c.player_id === defenderUser.id);

    if (!attackerChar) {
      return interaction.editReply('You do not have a character in this realm. Use `/register` first.');
    }
    if (!defenderChar) {
      return interaction.editReply(`${defenderUser.username} has not registered in this realm yet.`);
    }

    // Auto-claim cultivation Qi for both fighters before combat
    const now = Date.now();
    attackerChar.qi_current = await claimCultivation(attackerChar, now);
    defenderChar.qi_current = await claimCultivation(defenderChar, now);

    // Generate seed and resolve combat
    const seed   = generateCombatSeed(attackerChar.id, defenderChar.id);
    const result = resolveCombat(attackerChar, defenderChar, seed);

    const attackerWon = result.winner === 'attacker';
    const winnerChar  = attackerWon ? attackerChar : defenderChar;
    const loserChar   = attackerWon ? defenderChar : attackerChar;
    const winnerUser  = attackerWon ? attackerUser : defenderUser;
    const loserUser   = attackerWon ? defenderUser : attackerUser;

    // Calculate Qi changes
    const qiGained = Math.floor(Number(winnerChar.qi_max) * QI_WIN_PCT);
    const qiLost   = Math.floor(Number(loserChar.qi_max)  * QI_LOSE_PCT);
    const winnerNewQi = Math.min(Number(winnerChar.qi_current) + qiGained, Number(winnerChar.qi_max));
    const loserNewQi  = Math.max(Number(loserChar.qi_current)  - qiLost,  0);

    // Persist results
    await Promise.all([
      supabase.from('characters')
        .update({
          qi_current: winnerNewQi,
          pvp_wins:   Number(winnerChar.pvp_wins ?? 0) + 1,
          last_seen:  new Date(now).toISOString(),
        })
        .eq('id', winnerChar.id),

      supabase.from('characters')
        .update({
          qi_current: loserNewQi,
          pvp_losses: Number(loserChar.pvp_losses ?? 0) + 1,
          last_seen:  new Date(now).toISOString(),
        })
        .eq('id', loserChar.id),

      supabase.from('combat_log').insert({
        attacker_id: attackerChar.id,
        defender_id: defenderChar.id,
        server_id:   serverId,
        seed,
        winner_id:   winnerChar.id,
        log_json:    result,
      }),
    ]);

    // Build embed
    const attackerRealm = getRealm(attackerChar.realm_level);
    const defenderRealm = getRealm(defenderChar.realm_level);

    const embed = new EmbedBuilder()
      .setColor(0xffd700)
      .setTitle(`⚔️  ${attackerUser.username}  vs  ${defenderUser.username}`)
      .addFields(
        {
          name:   attackerUser.username,
          value:  `Realm: ${attackerRealm.name}\nPower: **${result.attacker_power}**\nRounds: **${result.attacker_rounds}**`,
          inline: true,
        },
        {
          name:   defenderUser.username,
          value:  `Realm: ${defenderRealm.name}\nPower: **${result.defender_power}**\nRounds: **${result.defender_rounds}**`,
          inline: true,
        },
        {
          name:  'Rounds  (🔴 = ' + attackerUser.username + '   🔵 = ' + defenderUser.username + ')',
          value: roundBar(result.log),
        },
        {
          name:   '🏆 Winner',
          value:  `**${winnerUser.username}** wins! (+${qiGained.toLocaleString()} Qi)`,
          inline: true,
        },
        {
          name:   '💔 Loser',
          value:  `${loserUser.username} loses. (−${qiLost.toLocaleString()} Qi)`,
          inline: true,
        },
      )
      .setFooter({ text: `Seed: ${seed} — result is deterministic and replayable` });

    await interaction.editReply({ embeds: [embed] });
    addFlavorText(interaction, embed,
      `${winnerUser.username} at the ${getRealm(winnerChar.realm_level).name} realm has defeated ${loserUser.username} at the ${getRealm(loserChar.realm_level).name} realm in a ${result.rounds_played}-round duel, claiming ${qiGained.toLocaleString()} Qi. Narrate this victory briefly with cultivation themes.`
    );
  },
};
