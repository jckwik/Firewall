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
        .setDescription('The channel to set as the schedule channel'))
.addStringOption(option => option.setName('type')
        .setRequired(true)
        .setDescription('The type of channel to set (results or schedule)')
        .addChoice('Results', 'Results')
        .addChoice('Schedule', 'Schedule'));
export async function execute(interaction: CommandInteraction) {
  const tier = interaction.options.getNumber('tier');
  const channel = interaction.options.getChannel('channel') as GuildChannel;
  const type = interaction.options.getString('type');
  const bot = FirewallBot.Instance();
  bot.config[`Tier${tier}${type}Channel`] = channel.id;
  bot.saveConfig();
  interaction.reply({content: `Configuration setting Tier${tier}${type}Channel set to ${channel.id} (${channel.name})`, ephemeral: true});
}
