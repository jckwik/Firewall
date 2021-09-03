import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { FirewallBot } from "../bot";

export const data = new SlashCommandBuilder()
  .setName("report-day-games")
  .setDescription("Set the channel to report today's games!")
  .addChannelOption((option) =>
    option
      .setName("channel")
      .setDescription("The channel to report games to, if you want to change.")
  )
  .addBooleanOption((option) =>
    option
      .setName("new-message")
      .setDescription("Whether to send a new message or edit the current one.")
  );
export async function execute(interaction: CommandInteraction) {
  await interaction.reply({ content: "Retrieving and sending schedule..." });
  const channel = interaction.options.getChannel("channel");
  var newMessage:boolean = interaction.options.getBoolean("new-message");
  if (newMessage === null) newMessage = false;
  const bot = FirewallBot.Instance();
  if (channel !== null) {
    bot.config.DailyScheduleChannel = channel.id;
    bot.saveConfig();
  }
  try {
    const success = await bot.reportDayGames(newMessage);
    if (success) await interaction.editReply("Sent!");
    else await interaction.editReply("Failed to send!");
  } catch (e) {
    await interaction.editReply("Something went wrong!");
    console.log(e);
  }
}
