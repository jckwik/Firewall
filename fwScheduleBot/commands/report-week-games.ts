import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { FirewallBot } from "../bot";

export const data = new SlashCommandBuilder()
  .setName("report-week-games")
  .setDescription("Force an update of the current weeks games")
  .addNumberOption((option) =>
    option
      .setName("week")
      .setDescription("The current week, if you want to update it.")
  )
  .addBooleanOption((option) =>
    option
      .setName("new-message")
      .setDescription("Whether to send a new message or edit the current one.")
  );
export async function execute(interaction: CommandInteraction) {
  await interaction.reply({ content: "Retrieving and sending schedule..." });
  const week = interaction.options.getNumber("week");
  var newMessage:boolean = interaction.options.getBoolean("new-message");
  if (newMessage === null) newMessage = false;
  const bot = FirewallBot.Instance();
  if (week !== null) {
    bot.config.CurrentWeek = week;
    bot.saveConfig();
  }
  try {
    const success = await bot.reportAllWeekGames(bot.config.CurrentWeek, newMessage);
    if (success) await interaction.editReply("Sent!");
    else await interaction.editReply("Failed to send!");
  } catch (e) {
    await interaction.editReply("Something went wrong!");
    console.log(e);
  }
}
