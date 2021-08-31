import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { clientId, guildId } from './config.json';
const appconfig = require('dotenv').config();
import { readdirSync } from 'fs';

const commandFiles = readdirSync('./fwScheduleBot/commands').filter(file => file.endsWith('.js'));
const commands = [];
// 	new SlashCommandBuilder()
// 		.setName('current_teams')
// 		.setDescription('Lists all current teams'),
// 	new SlashCommandBuilder()
// 		.setName('set_schedule_channel')
// 		.setDescription('Set schedule channel'),
// 	new SlashCommandBuilder()
// 		.setName('set_tier_id')
// 		.setDescription('Set tier id config'),
// 	new SlashCommandBuilder()
// 		.setName('report_schedule_configuration')
// 		.setDescription('Report configuration'),
// 	new SlashCommandBuilder()
// 		.setName('report_week_games')
// 		.setDescription('Send schedule for week games'),
// 	new SlashCommandBuilder()
// 		.setName('report_day_games')
// 		.setDescription('Send today\'s scheduled games'),
// 	new SlashCommandBuilder()
// 		.setName('set_current_season')
// 		.setDescription('Set current season id'),
// 	new SlashCommandBuilder()
// 		.setName('set_daily_schedule_channel')
// 		.setDescription('Set daily schedule channel'),
// 	new SlashCommandBuilder()
// 		.setName('reset_teams')
// 		.setDescription('Reset teams'),
// ].map((command) => command.toJSON());

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	commands.push(command.data.toJSON());
}
const rest = new REST({ version: '9' }).setToken(appconfig.parsed.BOT_TOKEN);

(async () => {
	try {
		await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
			body: commands,
		});

		console.log('Successfully registered application commands.');
	}
	catch (error) {
		console.error(error);
	}
})();
