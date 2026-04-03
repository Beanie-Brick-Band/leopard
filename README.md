<a id="readme-top"></a>

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/Beanie-Brick-Band/leopard">
    <img src="logo.svg" alt="Leopard logo" width="80" height="80">
  </a>

  <h3 align="center">Leopard</h3>

  <p align="center">
    <!-- TODO: Write a one-line project description / tagline -->
    An educational platform for code learning with live workspaces and replay
    <br />
    <!-- TODO: Uncomment and update links as needed -->
    <!--
    <a href="https://leopard.nolapse.tech"><strong>Live Demo</strong></a>
    &middot;
    -->
  </p>

  <!-- TODO: Uncomment shields once the repo is public / has releases
  [![Contributors][contributors-shield]][contributors-url]
  [![Forks][forks-shield]][forks-url]
  [![Stargazers][stars-shield]][stars-url]
  [![Issues][issues-shield]][issues-url]
  [![License][license-shield]][license-url]
  -->

</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about-the-project">About The Project</a></li>
    <li><a href="#built-with">Built With</a></li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
        <li><a href="#environment-variables">Environment Variables</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#project-structure">Project Structure</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->

## About The Project

Leopard is a full-stack educational platform that enables teachers to create coding assignments and students to complete them inside live cloud workspaces. It captures coding activity via a VS Code extension and provides a replay scrubber so teachers can review how students approached each problem.

**Key features:**

- **Teacher Portal** &mdash; Create classrooms, manage assignments with starter code, review submissions, annotate feedback, and release grades
- **Student Portal** &mdash; View assignments, launch cloud workspaces, submit code, and check grades
- **Live Cloud Workspaces** &mdash; Coder-powered VS Code workspaces provisioned per student
- **Code Replay** &mdash; Scrub through a student's coding session event-by-event to understand their thought process
- **VS Code Extension** &mdash; Captures edit events from the student's workspace for replay

## Demo Video

YouTube: https://youtu.be/clT2PKWQutI

## Built With

<!-- TODO: Add an architecture diagram if you have one -->

- [Next.js 16](https://nextjs.org/) &mdash; Frontend framework (App Router)
- [React 19](https://react.dev/) &mdash; UI library
- [Convex](https://www.convex.dev/) &mdash; Serverless backend & real-time database
- [Better Auth](https://www.better-auth.com/) &mdash; Authentication (Discord OAuth)
- [Tailwind CSS v4](https://tailwindcss.com/) &mdash; Utility-first styling
- [shadcn/ui](https://ui.shadcn.com/) &mdash; UI component library (Radix primitives)
- [Coder](https://coder.com/) &mdash; Cloud development workspaces
- [MinIO](https://min.io/) &mdash; S3-compatible object storage (starter code)
- [Turborepo](https://turborepo.com/) &mdash; Monorepo build system
- [pnpm](https://pnpm.io/) &mdash; Package manager
- [Vitest](https://vitest.dev/) &mdash; Testing framework
- [Terraform](https://www.terraform.io/) &mdash; Infrastructure as Code (OCI)
- [Kubernetes](https://kubernetes.io/) &mdash; Container orchestration
- [GitHub Actions](https://github.com/features/actions) &mdash; CI/CD

<!-- GETTING STARTED -->

## Getting Started

Follow these steps to get a local development environment running.

### Prerequisites

- [Node.js](https://nodejs.org/) **>=22.21.0**
- [pnpm](https://pnpm.io/) **>=10.19.0**
- A [Convex](https://www.convex.dev/) account & project
- A [Coder](https://coder.com/) instance for cloud workspaces
- A [MinIO](https://min.io/) instance (or any S3-compatible store) for starter code uploads

### Installation

1. **Clone the repository**

   ```sh
   git clone https://github.com/Beanie-Brick-Band/leopard.git
   cd leopard
   ```

2. **Install dependencies**

   ```sh
   pnpm install
   ```

3. **Configure environment variables**

   ```sh
   cp .env.example .env
   ```

   Fill in the values in `.env` — see [Environment Variables](#environment-variables) below.

4. **Set up the Convex backend**

   ```sh
   # Log in to Convex (if you haven't already)
   npx convex login

   # Deploy / sync your Convex functions
   npx convex dev
   ```

5. **Start the development server**

   ```sh
   pnpm dev
   ```

   This runs the dev proxy and launches all packages in watch mode via Turborepo. The Next.js app will be available at `http://localhost:3000`.

### Environment Variables

Create a `.env` file in the project root (see `.env.example` for reference):

| Variable                      | Description                                                 |
| ----------------------------- | ----------------------------------------------------------- |
| `POSTGRES_URL`                | Supabase PostgreSQL connection string                       |
| `BETTER_AUTH_SECRET`          | Auth secret — generate with `openssl rand -base64 32`       |
| `CONVEX_DEPLOYMENT`           | Your Convex deployment identifier                           |
| `NEXT_PUBLIC_CONVEX_URL`      | Public Convex URL (`https://your-project.convex.cloud`)     |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Public Convex site URL (`https://your-project.convex.site`) |
| `SITE_URL`                    | Your app URL (default: `http://localhost:3000`)             |
| `AUTH_DISCORD_ID`             | Discord OAuth client ID                                     |
| `AUTH_DISCORD_SECRET`         | Discord OAuth client secret                                 |
| `CODER_URL`                   | URL of your Coder deployment                                |
| `MINIO_ENDPOINT`              | MinIO endpoint URL                                          |
| `MINIO_ACCESS_KEY`            | MinIO access key                                            |
| `MINIO_SECRET_KEY`            | MinIO secret key                                            |
| `MINIO_BUCKET`                | MinIO bucket name (default: `starter-codes`)                |

<!-- USAGE -->

## Usage

<!-- TODO: Add screenshots or GIFs demonstrating the teacher and student workflows -->

**Development commands:**

| Command           | Description                             |
| ----------------- | --------------------------------------- |
| `pnpm dev`        | Start all apps & packages in watch mode |
| `pnpm build`      | Production build via Turborepo          |
| `pnpm test`       | Run tests (Vitest)                      |
| `pnpm lint`       | Lint all packages (ESLint)              |
| `pnpm lint:fix`   | Auto-fix lint issues                    |
| `pnpm format`     | Check formatting (Prettier)             |
| `pnpm format:fix` | Auto-fix formatting                     |
| `pnpm typecheck`  | Run TypeScript type checking            |
| `pnpm ui-add`     | Add a new shadcn/ui component           |

<!-- CONTRIBUTING -->

## Contributing

Leopard began as a **capstone project**. The codebase is shared openly for anyone who wants to explore how it works or use it as a reference, but **we are not accepting contributions**, pull requests, or feature requests. If this project helps your own learning, feel free to fork it and experiment on your own copy.

<!-- LICENSE -->

## License

<!-- TODO: Specify your license and add a LICENSE file -->

See `LICENSE` for more information.

<!-- CONTACT -->

## Contact

<!-- TODO: Add your contact info -->

Project Link: [https://github.com/Beanie-Brick-Band/leopard](https://github.com/Beanie-Brick-Band/leopard)

<!-- ACKNOWLEDGMENTS -->

## Acknowledgments

- [create-t3-turbo](https://github.com/t3-oss/create-t3-turbo) &mdash; Monorepo starter template this project was bootstrapped from
- [shadcn/ui](https://ui.shadcn.com/) &mdash; Beautiful, accessible UI components
- [Convex](https://www.convex.dev/) &mdash; Serverless backend platform
- [Best-README-Template](https://github.com/othneildrew/Best-README-Template) &mdash; README template inspiration

<!-- TODO: Add any other acknowledgments -->

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
