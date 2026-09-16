import type { Decorator, Preview } from "@storybook/react-vite";
import { ApolloProvider } from "@apollo/client";
import { createApolloClient } from "@xts/api-client";
import "../src/styles/globals.css";

// AppShell (and anything else using useAuth()) calls useMutation internally
// for Login/RegisterUser, so every story needs an ApolloProvider ancestor —
// same mock-backed client every app uses (see @xts/api-client).
const apolloClient = createApolloClient();
const withApollo: Decorator = (Story) => (
  <ApolloProvider client={apolloClient}>
    <Story />
  </ApolloProvider>
);

const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme === "dark" ? "dark" : "light";
  return (
    <div className={theme === "dark" ? "dark" : undefined}>
      <div className="min-h-[4rem] bg-background p-6 text-foreground">
        <Story />
      </div>
    </div>
  );
};

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  globalTypes: {
    theme: {
      description: "Design system theme",
      defaultValue: "light",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [withTheme, withApollo],
};

export default preview;
