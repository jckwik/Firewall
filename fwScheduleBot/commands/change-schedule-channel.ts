import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, GuildChannel } from "discord.js";
import { FirewallBot } from "../bot";

export const data = new SlashCommandBuilder()
  .setName("change-schedule-channel")
  .setDescription("Change a schedule channel")
  .addNumberOption(option => option.setName('tier')
        .setRequired(true)
        .setDescription('The tier of the team')
        .addChoice('1', 1)
        .addChoice('2', 2)
        .addChoice('3', 3)
        .addChoice('4', 4)
        .addChoice('5', 5))
  .addChannelOption(option => option.setName('channel')
        .setRequired(true)
        .setDescription('The channel to set as the schedule channel'));
export async function execute(interaction: CommandInteraction) {
  const tier = interaction.options.getNumber('tier');
  const channel = interaction.options.getChannel('channel') as GuildChannel;
  const bot = FirewallBot.Instance();
  bot.config[`Tier${tier}ScheduleChannel`] = channel.id;
  bot.saveConfig();
  interaction.reply({content: `Configuration setting Tier${tier}ScheduleChannel set to ${channel.id}`, ephemeral: true});
}
