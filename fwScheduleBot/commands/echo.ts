import { SlashCommandBuilder } from '@discordjs/builders';

export const data = new SlashCommandBuilder()
    .setName('echo')
    .setDescription('Replies with your input!')
    .addStringOption(option => option.setName('input')
        .setDescription('The input to echo back')
        .setRequired(true));
export async function execute(interaction) {
    await interaction.reply(interaction.options.getString('input'));
}