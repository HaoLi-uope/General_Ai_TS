import {MemoryStorage, TurnContext} from "botbuilder";
import * as path from "path";
import config from "../config";
import axios from 'axios';

// See https://aka.ms/teams-ai-library to learn more about the Teams AI library.
import {
  Application,
  ActionPlanner,
  OpenAIModel,
  PromptManager,
  TurnState,
  Memory,
  DefaultConversationState
} from "@microsoft/teams-ai";

// Create AI components
interface ConversationState extends DefaultConversationState {
  lightsOn: boolean;
  text: string;
}
type ApplicationTurnState = TurnState<ConversationState>;

console.log(config)

const model = new OpenAIModel({
  azureApiKey: config.azureOpenAIKey,
  azureDefaultDeployment: config.azureOpenAIDeploymentName,
  azureEndpoint: config.azureOpenAIEndpoint,

  useSystemMessages: true,
  logRequests: true,
});
const prompts = new PromptManager({
  promptsFolder: path.join(__dirname, "../prompts"),
});
const planner = new ActionPlanner({
  model,
  prompts,
  defaultPrompt: "chat",
});

// Define storage and application
const storage = new MemoryStorage();
const app = new Application<ApplicationTurnState>({
  storage,
  ai: {
    planner
  }
});

planner.prompts.addFunction('getLightStatus', async (context: TurnContext, memory: Memory) => {
  return memory.getValue('conversation.lightsOn') ? 'on' : 'off';
});

app.ai.action('LightsOn', async (context: TurnContext, state: ApplicationTurnState) => {
  if (state.conversation.lightsOn) {
    return `the lights are already on`;
  }
  state.conversation.lightsOn = true;
  await context.sendActivity(`[lights on]`);
  return `the lights are now on`;
});

app.ai.action('LightsOff', async (context: TurnContext, state: ApplicationTurnState) => {
  if (!state.conversation.lightsOn) {
    return `the lights are already off`;
  }
  state.conversation.lightsOn = false;
  await context.sendActivity(`[lights off]`);
  return `the lights are now off`;
});

app.ai.action('GetLightStatus', async (context: TurnContext, state: ApplicationTurnState) => {
  return `the lights are ${state.conversation.lightsOn ? 'on' : 'off'}`;
});

interface PauseParameters {
  time: number;
}

app.ai.action('GetWeather', async (context: TurnContext, state: ApplicationTurnState) => {
  const options = {
    method: 'GET',
    url: 'https://weatherapi-com.p.rapidapi.com/current.json',
    params: {q: '-36.848450, 174.762192'},
    headers: {
      'x-rapidapi-key': config.weatherKey,
      'x-rapidapi-host': config.weatherHost
    }
  };
    const response = await axios.request(options)
    state.conversation.text = `The current weather at ${response.data.location.name}, ${response.data.location.country} is ${response.data.current.condition.text}`;
    await context.sendActivity(`${state.conversation.text}`);
    context.responded = true;
    return 'Action done, think about your next action';
});

app.ai.action('Pause', async (context: TurnContext, state: ApplicationTurnState, parameters: PauseParameters) => {
  await context.sendActivity(`[pausing for ${parameters.time / 1000} seconds]`);
  await new Promise((resolve) => setTimeout(resolve, parameters.time));
  return `done pausing`;
});

export default app;
