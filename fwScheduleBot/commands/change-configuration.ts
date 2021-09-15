import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { FirewallBot } from "../bot";

export const data = new SlashCommandBuilder()
  .setName("change-configuration")
  .setDescription("Change a configuration value")
  .addStringOption((option) =>
    option
      .setName("configuration")
      .setDescription("The configuration to change")
      .setRequired(true)
  )
  .addNumberOption((option) =>
    option
      .setName("value")
      .setRequired(true)
      .setDescription("The value of the configuration")
  );
export async function execute(interaction: CommandInteraction) {
  const configuration = interaction.options.getString("configuration");
  const value = interaction.options.getNumber("value");
  const bot = FirewallBot.Instance();
  bot.config[configuration] = value;
  bot.saveConfig();
  interaction.reply(`Configuration setting ${configuration} set to ${value}`);
}
