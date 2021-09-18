import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, GuildChannel } from "discord.js";
import { FirewallBot } from "../bot";

export const data = new SlashCommandBuilder()
  .setName("change-daily-schedule-channel")
  .setDescription("Change the daily schedule channel")
  .addChannelOption(option => option.setName('channel')
        .setRequired(true)
        .setDescription('The channel to set as the schedule channel'))
    .addStringOption(option => option.setName('configuration')
        .setRequired(true)
        .setDescription('The configuration to set the channel for')
        .addChoice('Daily', 'Daily')
        .addChoice('Caster', 'Caster'));
export async function execute(interaction: CommandInteraction) {
  const channel = interaction.options.getChannel('channel') as GuildChannel;
  const configuration = interaction.options.getString('configuration') as string;
  const bot = FirewallBot.Instance();
  const configurationToSave = `${configuration}ScheduleChannel`;
  bot.config[configurationToSave] = channel.id;
  bot.saveConfig();
  interaction.reply({content: `Configuration setting ${configurationToSave} set to ${channel.id}`, ephemeral: true});
}
