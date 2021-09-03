import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageEmbed } from "discord.js";
import { FirewallBot } from "../bot";

export const data = new SlashCommandBuilder()
    .setName("report_configuration")
    .setDescription("Print out current configuration values");
export async function execute(interaction) {
    const embed = new MessageEmbed()
        .setTitle("Configuration")
        .setTimestamp()
        .setFooter(Date.now().toString());
    const bot = FirewallBot.Instance();
    embed.addField("CurrentWeek", bot.config.CurrentWeek.toString());
    embed.addField("DailyScheduleChannel", bot.config.DailyScheduleChannel.toString());
    embed.addField("Tier1ScheduleChannel", bot.config.Tier1ScheduleChannel.toString());
    embed.addField("Tier2ScheduleChannel", bot.config.Tier2ScheduleChannel.toString());
    embed.addField("Tier3ScheduleChannel", bot.config.Tier3ScheduleChannel.toString());
    embed.addField("Tier4ScheduleChannel", bot.config.Tier4ScheduleChannel.toString());
    embed.addField("Tier5ScheduleChannel", bot.config.Tier5ScheduleChannel.toString());
    embed.addField("Tier1SeasonId", bot.config.Tier1SeasonId.toString());
    embed.addField("Tier2SeasonId", bot.config.Tier2SeasonId.toString());
    embed.addField("Tier3SeasonId", bot.config.Tier3SeasonId.toString());
    embed.addField("Tier4SeasonId", bot.config.Tier4SeasonId.toString());
    embed.addField("Tier5SeasonId", bot.config.Tier5SeasonId.toString());
    try {
        await interaction.reply({embeds: [embed]});
    } catch (e) {
        console.log(e);
    }
}
