import os
import discord
import logging
import requests
import operator
import json
from datetime import datetime
from requests.api import head

__location__ = os.path.realpath(os.path.join(
    os.getcwd(), os.path.dirname(__file__)))
current_season = 25
current_teams = {0: "Unknown or undefined team"}
current_events = {}
config = {
    "Tier1ScheduleChannel": 0,
    "Tier2ScheduleChannel": 0,
    "Tier3ScheduleChannel": 0,
    "Tier4ScheduleChannel": 0,
    "Tier5ScheduleChannel": 0,
    "Tier1SeasonId": 0,
    "Tier2SeasonId": 0,
    "Tier3SeasonId": 0,
    "Tier4SeasonId": 0,
    "Tier5SeasonId": 0,
    "ModeratorRoleId": 0,
    "CurrentSeason": 25,
    "CurrentTeams": current_teams,
    "CurrentEvents": current_events,
}
authorized_roles = ['〈 👑 〉 Owner', '〈 🛠️ 〉 League Director', '〈 👾 〉 League Commissioner']

def get_current_season_teams():
    resp = requests.get(
        "https://firewallesports.com/wp-json/sportspress/v2/teams?_fields=title,id&per_page=100&seasons={}".format(config['CurrentSeason']))

    teams = {0: "Unknown or undefined team"}

    for team in resp.json():
        teams[team['id']] = team['title']['rendered']

    return dict(sorted(teams.items(), key=operator.itemgetter(1)))


def get_all_events():
    event_loop_count = 0
    total_event_number = 1

    while event_loop_count < int(total_event_number):
        resp = requests.get(
            "https://firewallesports.com/wp-json/sportspress/v2/events?per_page=100&orderby=date&order=desc&offset={}".format(event_loop_count))
        for event in resp.json():
            current_events[event['id']] = event

        total_event_number = resp.headers['X-WP-Total']
        event_loop_count += 100


def load_config():
    if (os.path.exists(__location__+"\\fwScheduleConfig.json")):
        print("Loading configuration from: {}".format(__location__+"\\fwScheduleConfig.json"))
        with open(__location__+"fwScheduleConfig.json", 'r') as openfile:
            global config
            config = json.load(openfile)


def save_config(config):
    with open(__location__+"fwScheduleConfig.json", "w") as outfile:
        json.dump(config, outfile)

def authorized_author(roles):
    for role in roles:
        if role.name in authorized_roles:
            return True
    return False

class ScheduleReporter(discord.Client):
    async def on_ready(self):
        print('Logged on as', self.user)
        save_config(config)
        activity = discord.Activity(name="??help", type=discord.ActivityType.playing)
        await client.change_presence(activity=activity)

    async def report_week_tier(self, tier, week):
        fields = []

        for event in current_events:
            if current_events[event]['day'] == week and int(current_events[event]['seasons'][0]) == int(config['CurrentSeason']) and int(current_events[event]['leagues'][0]) == int(config['Tier{}SeasonId'.format(tier)]):
                team1name = current_teams[current_events[event]['teams'][0]]
                team2name = current_teams[current_events[event]['teams'][1]]
                team1score = current_events[event]['results'][str(current_events[event]['teams'][0])]['mapscore']
                team2score = current_events[event]['results'][str(current_events[event]['teams'][1])]['mapscore']
                name = "{} VS {}".format(team1name, team2name)
                if team1score == "":
                    event_time = datetime.strftime(datetime.fromisoformat(current_events[event]['date']), "%A, %B %d, %I:%M %p")
                    value = "{}: {} VS {}".format(event_time, team1name, team2name)
                else:
                    value = "Score: {}: {} VS {}: {}".format(team1name, team1score, team2name, team2score)
                fields.append({"name": name, "value": value,})
                                            
        if len(fields) == 0:
            fields.append({"name": "Week {}".format(week),
                           "value": "No games scheduled for Week {}".format(week)})
        data = {"title": "Tier {} Week {} Schedule".format(tier, week),
                "fields": fields}
        embed = discord.Embed.from_dict(data)
        channel = client.get_channel(
            config['Tier{}ScheduleChannel'.format(tier)])
        await channel.send(content=None, embed=embed)

    async def on_message(self, message):
        # don't respond to ourselves
        if message.author == self.user:
            return

        if not authorized_author(message.author.roles):
            return

        if message.content.startswith("??"):
            await message.add_reaction('⌚')
            command = message.content[2:]
            cparams = command.split()

        else: 
            return

        if cparams[0] == 'ping':
            await message.channel.send('pong')
            await message.add_reaction('✔')

        elif cparams[0] == "currentteams":
            teams = current_teams
            output = ""
            for team in teams:
                print(teams[team])
                output += "\r\n{}".format(teams[team])
            output += "\r\nID 31 (GE): {}".format(teams[31])
            await message.channel.send(output)
            await message.add_reaction('✔')

        elif cparams[0] == "nextgame":
            output = "TBD"

            resp = requests.get(
                "https://firewallesports.com/wp-json/sportspress/v2/events?per_page=1&orderby=date&order=desc")

            for event in resp.json():
                output += "\r\n" + ('({}) {}, {}: {} VS {}'.format(event['id'], event['title']['rendered'], datetime.strftime(
                    datetime.fromisoformat(event['date']), "%A, %B %d, %I:%M %p"), current_teams[event['teams'][0]], current_teams[event['teams'][1]]))

            await message.channel.send(output)
            await message.add_reaction('✔')

        elif cparams[0] == "setScheduleChannel":
            tier = cparams[1]
            output = "Setting Tier {} channel to id {}".format(
                tier, message.channel.id)
            config['Tier{}ScheduleChannel'.format(tier)] = message.channel.id
            save_config(config)
            await message.channel.send(output)
            await message.add_reaction('✔')

        elif cparams[0] == "setTierId":
            tier = cparams[1]
            id = cparams[2]
            output = "Setting configuration value {} to {}".format(
                'Tier{}SeasonId'.format(tier), id)
            config['Tier{}SeasonId'.format(tier)] = id
            save_config(config)
            await message.channel.send(output)
            await message.add_reaction('✔')

        elif cparams[0] == "reportScheduleConfiguration":
            output = "Channels:\r\nTier 1: {}\r\nTier 2: {}\r\nTier 3: {}\r\nTier 4: {}\r\nTier 5: {}".format(
                config['Tier1ScheduleChannel'], config['Tier2ScheduleChannel'], config['Tier3ScheduleChannel'], config['Tier4ScheduleChannel'], config['Tier5ScheduleChannel'])
            output += "\r\nLeague Ids:\r\nTier 1: {}\r\nTier 2: {}\r\nTier 3: {}\r\nTier 4: {}\r\nTier 5: {}".format(
                config['Tier1SeasonId'], config['Tier2SeasonId'], config['Tier3SeasonId'], config['Tier4SeasonId'], config['Tier5SeasonId'])
            output += "\r\nCurrent User: {}".format(message.author.roles)
            data = {"title": "Schedule Configuration",
                    "fields": [{"name": "Configuration",
                                "value": output, }]
                    }
            embed = discord.Embed.from_dict(data)
            await message.channel.send(content=None, embed=embed)
            await message.add_reaction('✔')

        elif cparams[0] == "reportWeekGames":
            week = cparams[1]

            tier = 1
            while tier < 5:
                await self.report_week_tier(tier, week)
                tier += 1

            output = "Sent schedules for week {}".format(week)
            await message.channel.send(output)
            await message.add_reaction('✔')

        elif cparams[0] == "help":
            fields = []
            fields.append({"name": "= Command List = (??)", 
                "value": "**currentteams**\r\n**setScheduleChannel**\r\n**setTierId**\r\n**reportScheduleConfiguration**\r\n**reportWeekGames**\r\n",})
            data = {"fields": fields}
            embed = discord.Embed.from_dict(data)
            await message.channel.send(content=None, embed=embed)
            await message.add_reaction('✔')

        else: 
            await message.add_reaction('❌')

logging.basicConfig(level=logging.INFO)

load_config()
current_teams = get_current_season_teams()
get_all_events()
config["CurrentEvents"] = current_events
config["CuurentTeams"] = current_teams
save_config(config)
client = ScheduleReporter()
token = os.environ.get("BOT_TOKEN")
client.run(token)

# https://discord.com/oauth2/authorize?client_id=858528014500757504&permissions=1073867856&scope=bot
