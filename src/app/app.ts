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
  DefaultConversationState
} from "@microsoft/teams-ai";

// Create AI components
interface ConversationState extends DefaultConversationState {
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
    return 'Here is the data: ' + JSON.stringify(response.data) + 'format this nicely and return it to the user';
});

app.ai.action('GetUsername', async (context: TurnContext, state: ApplicationTurnState) => {
  await context.sendActivity(`You are ${context.activity.from.name}`);
  return `user name is ${context.activity.from.name}`;
});

export default app;
