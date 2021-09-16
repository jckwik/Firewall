import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageEmbed, TextChannel } from "discord.js";
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
    let channel = FirewallBot._client.channels.cache.get(bot.config.DailyScheduleChannel) as TextChannel;
    let channelName = "Not Found";
    if (channel) channelName = channel.name;
    embed.addField("DailyScheduleChannel", bot.config.DailyScheduleChannel.toString() + " (" + channelName + ")");
    channel = FirewallBot._client.channels.cache.get(bot.config.Tier1ScheduleChannel) as TextChannel;
    if (channel) channelName = channel.name;
    else channelName = "Not Found";
    embed.addField("Tier1ScheduleChannel", bot.config.Tier1ScheduleChannel.toString() + " (" + channelName + ")");
    channel = FirewallBot._client.channels.cache.get(bot.config.Tier2ScheduleChannel) as TextChannel;
    if (channel) channelName = channel.name;
    else channelName = "Not Found";
    embed.addField("Tier2ScheduleChannel", bot.config.Tier2ScheduleChannel.toString() + " (" + channelName + ")");
    channel = FirewallBot._client.channels.cache.get(bot.config.Tier3ScheduleChannel) as TextChannel;
    if (channel) channelName = channel.name;
    else channelName = "Not Found";
    embed.addField("Tier3ScheduleChannel", bot.config.Tier3ScheduleChannel.toString() + " (" + channelName + ")");
    channel = FirewallBot._client.channels.cache.get(bot.config.Tier4ScheduleChannel) as TextChannel;
    if (channel) channelName = channel.name;
    else channelName = "Not Found";
    embed.addField("Tier4ScheduleChannel", bot.config.Tier4ScheduleChannel.toString() + " (" + channelName + ")");
    channel = FirewallBot._client.channels.cache.get(bot.config.Tier5ScheduleChannel) as TextChannel;
    if (channel) channelName = channel.name;
    else channelName = "Not Found";
    embed.addField("Tier5ScheduleChannel", bot.config.Tier5ScheduleChannel.toString() + " (" + channelName + ")");
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
