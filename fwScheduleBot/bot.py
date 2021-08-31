import os
import discord
import logging
import requests
import operator
import json
import asyncio
from discord.ext import commands, tasks
from datetime import datetime, timedelta
from requests.api import head

__location__ = os.path.realpath(os.path.join(
    os.getcwd(), os.path.dirname(__file__)))
current_season = 25
current_teams = {0: "Unknown or undefined team"}
current_events = {}
current_players = {}
config = {
    "Tier1ScheduleChannel": 0,
    "Tier2ScheduleChannel": 0,
    "Tier3ScheduleChannel": 0,
    "Tier4ScheduleChannel": 0,
    "Tier5ScheduleChannel": 0,
    "DailyScheduleChannel": 0,
    "Tier1SeasonId": 0,
    "Tier2SeasonId": 0,
    "Tier3SeasonId": 0,
    "Tier4SeasonId": 0,
    "Tier5SeasonId": 0,
    "CurrentSeason": 25,
    "CurrentWeek": 0,
    "CurrentTeams": current_teams,
    "CurrentEvents": current_events,
    "CurrentPlayers": current_players,
}
authorized_roles = ['〈 👑 〉 Owner',
                    '〈 🛠️ 〉 League Director', '〈 👾 〉 League Commissioner']


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

def get_all_players():
    player_loop_count = 0
    total_player_number = 1

    while player_loop_count < int(total_player_number):
        resp = requests.get(
            "https://firewallesports.com/wp-json/sportspress/v2/players?per_page=100&offset={}".format(player_loop_count))
        for event in resp.json():
            current_events[event['id']] = event

        total_player_number = resp.headers['X-WP-Total']
        player_loop_count += 100


def load_config():
    if (os.path.exists(__location__+"\\fwScheduleConfig.json")):
        print("Loading configuration from: {}".format(
            __location__+"\\fwScheduleConfig.json"))
        with open(__location__+"\\fwScheduleConfig.json", 'r') as openfile:
            global config
            config = json.load(openfile)


def save_config(config):
    with open(__location__+"\\fwScheduleConfig.json", "w") as outfile:
        json.dump(config, outfile)


def authorized_author(roles):
    for role in roles:
        if role.name in authorized_roles:
            return True
    return False


def refresh_data():
    global current_season, current_teams, current_events, config
    current_teams = get_current_season_teams()
    get_all_events()
    get_all_players()
    config["CurrentEvents"] = current_events
    config["CurrentTeams"] = current_teams
    config["CurrentPlayers"] = current_players
    save_config(config)

intents = discord.Intents.all()

bot = commands.Bot(command_prefix='??', description="Firewall Schedule Bot", intents=intents)

@bot.event
async def on_ready():
    print('Logged on as ', bot.user.name)
    save_config(config)
    activity = discord.Activity(
        name="??help", type=discord.ActivityType.playing)
    daily_refresh.start()
    await bot.change_presence(activity=activity)

async def report_week_tier(tier, week, newMessage=False):
    fields = []
    # put together a list of all the events for the week
    for event in current_events:
        if current_events[event]['day'] == week and int(current_events[event]['seasons'][0]) == int(config['CurrentSeason']) and int(current_events[event]['leagues'][0]) == int(config['Tier{}SeasonId'.format(tier)]):
            team1name = current_teams[current_events[event]['teams'][0]]
            team2name = current_teams[current_events[event]['teams'][1]]
            team1score = current_events[event]['results'][str(
                current_events[event]['teams'][0])]['mapscore']
            team2score = current_events[event]['results'][str(
                current_events[event]['teams'][1])]['mapscore']
            name = "{} VS {}".format(team1name, team2name)
            if team1score == "":
                event_time = datetime.strftime(datetime.fromisoformat(
                    current_events[event]['date']), "%A, %B %d, %I:%M %p")
                value = "{}: {} VS {}".format(
                    event_time, team1name, team2name)
            else:
                value = "Score: {}: {} VS {}: {}".format(
                    team1name, team1score, team2name, team2score)
            fields.append({"name": name, "value": value, })
    # if no events for the week, post a message saying so:
    if len(fields) == 0:
        fields.append({"name": "Week {}".format(week),
                       "value": "No games scheduled for Week {}".format(week)})
    footer = {
        'text': 'Generated by fwScheduleBot - Last Updated: {}'.format(datetime.now())}
    data = {"title": "Tier {} Week {} Schedule".format(tier, week),
            "fields": fields,
            "footer": footer, }
    embed = discord.Embed.from_dict(data)
    message_configuration = 'Tier{}ScheduleMessageWeek{}Season{}'.format(
        tier, week, current_season)
    channel = bot.get_channel(
        config['Tier{}ScheduleChannel'.format(tier)])
    if message_configuration in config:
        message = await channel.fetch_message(config[message_configuration])
        await message.edit(embed=embed)
    else:
        message = await channel.send(content=None, embed=embed)
        config[message_configuration] = message.id
        save_config(config)
# go through all of the current events, find all that have a date today, and post them to the channel
async def report_today_event(self, newMessage=False):
    if config['DailyScheduleChannel'] == 0:
        logger.warn("Daily schedule channel not set in config, skipping daily schedule posting")
        return
    fields = []
    for event in current_events:
        event_date = datetime.strftime(datetime.fromisoformat(
            current_events[event]['date']), "%x")
        if event_date == datetime.today().strftime("%x"):
            team1name = current_teams[current_events[event]['teams'][0]]
            team2name = current_teams[current_events[event]['teams'][1]]
            event_time = datetime.strftime(datetime.fromisoformat(
                current_events[event]['date']), "%I:%M %p")
            value = "{}: {} VS {}".format(event_time, team1name, team2name)
            fields.append({"name": "{} VS {}".format(
                team1name, team2name), "value": value})
    if len(fields) == 0:
        fields.append({"name": "No games scheduled for today.",
                      "value": "No games scheduled for today."})
    footer = {
        'text': 'Generated by fwScheduleBot - Last Updated: {}'.format(datetime.now())}
    data = {"title": "Today's Scheduled Games: {}".format(
        datetime.today().strftime("%A, %B %d")), "fields": fields, "footer": footer, }
    embed = discord.Embed.from_dict(data)
    message_configuration = 'TodayEventMessageId'
    channel = bot.get_channel(config['DailyScheduleChannel'])
    if message_configuration in config:
        message = await channel.fetch_message(config[message_configuration])
        await message.edit(embed=embed)
    else:
        message = await channel.send(content=None, embed=embed)
        config[message_configuration] = message.id
        save_config(config)

async def success_reaction(ctx):
    await ctx.message.add_reaction('✔')

async def error_reaction(ctx):
    await ctx.message.add_reaction('❌')

async def before_reaction(ctx):
    await ctx.message.add_reaction('⏳')

@bot.on_command_error
async def on_command_error(ctx, exception):
    if isinstance(exception, commands.CheckFailure):
        await ctx.channel.send("You don't have permission to use that command")
    elif isinstance(exception, commands.MissingRequiredArgument):
        await ctx.channel.send("Missing argument")
    elif isinstance(exception, commands.BadArgument):
        await ctx.channel.send("Bad Argument")
    elif isinstance(exception, commands.CommandInvokeError):
        await ctx.channel.send("Command Error")
    elif isinstance(exception, commands.CommandOnCooldown):
        await ctx.channel.send("Command on cooldown")
    else:
        await ctx.channel.send("Unknown Error")
    error_reaction(ctx)

@bot.command()
async def ping(ctx):
    await ctx.channel.send('pong')
    
@bot.command()
@commands.has_any_role('〈 👑 〉 Owner', '〈 🛠️ 〉 League Director', '〈 👾 〉 League Commissioner')
@commands.after_invoke(success_reaction)
@commands.before_invoke(before_reaction)
async def currentTeams(ctx):
    teams = config['CurrentTeams']
    output = ""
    for team in teams:
        output += "\r\n{}".format(teams[team])
    await ctx.channel.send(output)

@currentTeams.error
async def currentTeams_error(ctx, error):
    error_output(ctx, error)

@bot.command()
async def setScheduleChannel(ctx, tier: int, channel: discord.TextChannel):
    output = "Setting Tier {} channel to id {}".format(
        tier, channel)
    config['Tier{}ScheduleChannel'.format(tier)] = channel.id
    save_config(config)
    await ctx.channel.send(output)
    await ctx.message.add_reaction('✔')

@bot.command()
async def setTierId(ctx, tier: int, id: int):
    output = "Setting configuration value {} to {}".format(
        'Tier{}SeasonId'.format(tier), id)
    config['Tier{}SeasonId'.format(tier)] = id
    save_config(config)
    await ctx.channel.send(output)
    await ctx.message.add_reaction('✔')

@bot.command()
async def reportScheduleConfiguration(ctx):
    try:
        output = "Channels:\r\nTier 1: {}\r\nTier 2: {}\r\nTier 3: {}\r\nTier 4: {}\r\nTier 5: {}\r\nDaily: {}".format(
            config['Tier1ScheduleChannel'], config['Tier2ScheduleChannel'], config['Tier3ScheduleChannel'], config['Tier4ScheduleChannel'], config['Tier5ScheduleChannel'], config['DailyScheduleChannel'])
        output += "\r\nLeague Ids:\r\nTier 1: {}\r\nTier 2: {}\r\nTier 3: {}\r\nTier 4: {}\r\nTier 5: {}".format(
            config['Tier1SeasonId'], config['Tier2SeasonId'], config['Tier3SeasonId'], config['Tier4SeasonId'], config['Tier5SeasonId'])
        output += "\r\nCurrent Season: {}".format(current_season)
        output += "\r\nCurrent Week: {}".format(config['CurrentWeek'])
        output += "\r\nCurrent User: {}".format(ctx.author.roles)
    except Exception as e: 
        logger.error(e)
        output = f"Error getting configuration data: {e}."
    data = {"title": "Schedule Configuration",
            "fields": [{"name": "Configuration",
                        "value": output, }]
            }
    embed = discord.Embed.from_dict(data)
    await ctx.channel.send(content=None, embed=embed)
    await ctx.message.add_reaction('✔')

@bot.command()
async def reportWeekGames(ctx, week: int, newMessage: bool = False):
    tier = 1
    while tier < 5:
        await report_week_tier(tier, week, newMessage)
        tier += 1
    if newMessage:
        output = "Sent schedules for week {}".format(week)
    else:
        output = "Updated schedules for week {}".format(week)
    config['CurrentWeek'] = week
    save_config(config)
    await ctx.channel.send(output)
    await ctx.message.add_reaction('✔')

@bot.command()
async def reportDayGames(ctx, newMessage: bool = False):
    await report_today_event(newMessage)
    output = "Updated games for today"
    await ctx.channel.send(output)
    await ctx.message.add_reaction('✔')

@bot.command()
async def setCurrentSeason(ctx, season: int):
    config['CurrentSeason'] = season
    save_config(config)
    await ctx.channel.send("Set current season to {}".format(season))
    await ctx.message.add_reaction('✔')

@bot.command()
async def setDailyScheduleChannel(ctx, channel: discord.TextChannel):
    config['DailyScheduleChannel'] = channel.id
    save_config(config)
    await ctx.channel.send("Set daily schedule channel to {}".format(channel))
    await ctx.message.add_reaction('✔')

@bot.command()
async def resetTeams(ctx):
    current_teams = {0: "Unknown or undefined team"}
    current_teams = get_current_season_teams()
    config['CurrentTeams'] = current_teams
    save_config(config)
    await ctx.channel.send("Reset current teams")
    await ctx.message.add_reaction('✔')

@tasks.loop(hours=24)
async def daily_refresh(self):
    refresh_data()
    tier = 1
    while tier < 5:
        await report_week_tier(tier, config['CurrentWeek'], False)
        tier += 1
    await report_today_event(False)
    logging.info("Daily refresh complete at {}".format(datetime.now()))
    print("Testing the daily refresh complete at {}".format(datetime.now()))

@daily_refresh.before_loop
async def before_daily_refresh(self):
    await self.wait_until_ready()
    hour = 1
    minute = 0
    now = datetime.now()
    future = datetime(year=now.year, month=now.month, day=now.day, hour=hour, minute=minute)
    if now.hour >= hour and now.minute > minute:
        future += timedelta(days=1)
    await asyncio.sleep((future-now).seconds)


logger = logging.getLogger('discord')
logger.setLevel(logging.INFO)
handler = logging.FileHandler(
    filename=__location__ + '\\discord.log', encoding='utf-8', mode='w')
handler.setFormatter(logging.Formatter(
    '%(asctime)s:%(levelname)s:%(name)s: %(message)s'))
logger.addHandler(handler)

load_config()
refresh_data()
token = os.environ.get("BOT_TOKEN")
bot.run(token)
# https://discord.com/oauth2/authorize?client_id=858528014500757504&permissions=2684447824&scope=bot
