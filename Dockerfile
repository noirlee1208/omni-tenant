FROM node:22-bullseye

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install

COPY . .

# Run the typescript orchestrator directly
CMD ["npx", "tsx", "src/index.ts", "--run"]
