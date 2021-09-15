import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
const appconfig = require('dotenv').config();
import { readdirSync } from 'fs';

const commandFiles = readdirSync('./commands').filter(file => file.endsWith('.js'));
const commands = [];

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	commands.push(command.data.toJSON());
}
const rest = new REST({ version: '9' }).setToken(appconfig.parsed.BOT_TOKEN);

(async () => {
	try {
		await rest.put(Routes.applicationGuildCommands(appconfig.parsed.clientId, appconfig.parsed.guildId), {
			body: commands,
		});

		console.log('Successfully registered application commands.');
	}
	catch (error) {
		console.error(error);
	}
})();
