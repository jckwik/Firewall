import { SlashCommandBuilder } from '@discordjs/builders';
import { MessageEmbed } from "discord.js";
import { FirewallBot } from "../bot";

export const data = new SlashCommandBuilder()
    .setName('current_teams')
    .setDescription('Lists all current teams');
export async function execute(interaction) {
    const embeds = [];
    
    const bot = FirewallBot.Instance();
    
    var embed = new MessageEmbed()
        .setTitle("Team listing 1")
        .setTimestamp();
    bot.config.CurrentTeams.sort((a, b) => {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
    });


    var count = 1;
    var teamlistcount = 2;
    bot.config.CurrentTeams.forEach(team => {
        embed.addField(team.name, team.roleid?.toString() || team.id.toString());
        count++;
        if (count == 25) {
            embeds.push(embed);
            embed = new MessageEmbed()
                .setTitle("Team listing " + teamlistcount.toString())
                .setTimestamp()
                .setFooter(Date.now().toString());
            count++;
            teamlistcount++;
        }
    });
    if (count != 1) embeds.push(embed);

    await interaction.reply({embeds: embeds});
}