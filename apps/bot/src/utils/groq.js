import Groq from 'groq-sdk';

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are the narrator of Eternal Dao, a xianxia cultivation RPG.
Write vivid, immersive flavor text in 1-3 sentences. Use cultivation themes: Qi, dantian, heavenly tribulation, the Dao, spirit roots, immortal path, heaven and earth.
Be poetic but concise. Never break character. Never use modern language.`;

/**
 * Generate flavor text and silently edit the interaction reply to include it.
 * Fire-and-forget — call without await so the command doesn't block.
 *
 * @param {import('discord.js').CommandInteraction} interaction
 * @param {import('discord.js').EmbedBuilder} embed  - the already-sent embed (mutated in place)
 * @param {string} prompt  - the situation to narrate
 */
export async function addFlavorText(interaction, embed, prompt) {
  try {
    const res = await client.chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      messages:    [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: prompt },
      ],
      max_tokens:  120,
      temperature: 0.85,
    });

    const flavor = res.choices[0]?.message?.content?.trim();
    if (!flavor) return;

    embed.setDescription(`*${flavor}*`);
    await interaction.editReply({ embeds: [embed] });
  } catch {
    // Flavor text is optional — never surface Groq errors to the player
  }
}
