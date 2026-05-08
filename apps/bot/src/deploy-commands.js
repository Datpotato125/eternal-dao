import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const commands = [];
const commandFiles = readdirSync(join(__dirname, 'commands')).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const { default: command } = await import(`./commands/${file}`);
  commands.push(command.data.toJSON());
  console.log(`  Loaded: /${command.data.name}`);
}

const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId  = process.env.GUILD_ID;

if (guildId) {
  // Guild commands — appear instantly (dev mode)
  console.log(`\nRegistering ${commands.length} command(s) to guild ${guildId}...`);
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
  console.log('Done. Commands are live immediately.');
} else {
  // Global commands — up to 1 hour propagation (production)
  console.log(`\nRegistering ${commands.length} global command(s)...`);
  await rest.put(Routes.applicationCommands(clientId), { body: commands });
  console.log('Done. May take up to 1 hour to appear everywhere.');
}
