import { SlashCommandBuilder } from "@discordjs/builders";

export const data = new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with pong!");
export async function execute(interaction) {
    await interaction.reply("pong!");
    console.log(`${interaction.user.tag} pinged the bot!`);
    console.log(interaction.commandId);
}
