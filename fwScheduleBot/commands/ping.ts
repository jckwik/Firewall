import { SlashCommandBuilder } from "@discordjs/builders";

export const data = new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with pong!");
export async function execute(interaction) {
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
    interaction.editReply(`Roundtrip latency: ${sent.createdTimestamp - interaction.createdTimestamp}ms`);
    console.log(`${interaction.user.tag} pinged the bot!`);
    console.log(interaction.commandId);
}
