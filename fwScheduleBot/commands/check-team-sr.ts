import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageEmbed } from "discord.js";
import { FirewallBot } from "../bot";

export const data = new SlashCommandBuilder()
    .setName('check-team-sr')
    .setDescription('Check the SR of a team')
    .addNumberOption(option => option.setName('team')
        .setRequired(true)
        .setDescription('The id of the team list to check'))
    .addNumberOption(option => option.setName('tier')
        .setRequired(true)
        .setDescription('The tier of the team')
        .addChoice('1', 1)
        .addChoice('2', 2)
        .addChoice('3', 3)
        .addChoice('4', 4)
        .addChoice('5', 5));
export async function execute(interaction) {
    const team = interaction.options.getNumber('team');
    const tier = interaction.options.getNumber('tier');
    await interaction.deferReply();
    const bot = FirewallBot.Instance();
    const players = await bot.get_player_list_by_id(team);
    const teamsr = await bot.get_team_sr_average(team, players);
    const team_name = bot.get_team_name_by_id(team);
    const embed = new MessageEmbed()
        .setTitle(`SR Check Tier ${tier}`)
        .setTimestamp();
    const teamMax = bot.get_tier_team_max_sr(tier);
    if (teamsr > teamMax) {
        embed.setColor('#ff0000');
        embed.addField(`${team_name} Team SR`, `${teamsr}: over the max of ${teamMax}`);
    }
    else {
        embed.setColor('#00ff00');
        embed.addField(`${team_name} Team SR`, `${teamsr}: under the max of ${teamMax}`);
    }
    
    for (const player of players) {
        const playerMax = bot.get_tier_player_max_sr(tier);
        if (player.sr >= playerMax) {
            embed.addField(`${player.name}`, `${player.sr} (${player.sr - playerMax} over max)`);
            embed.setColor('#ff0000');
        }
        else if (player.sr === 0) {
            embed.addField(`${player.name}`, `${player.sr} (unranked)`);
        }
    }
    if (embed.fields.length === 1) {
        embed.addField('No players', 'No players have an SR over the max');
    }

    await interaction.editReply({embeds: [embed]});
}