import * as Sentry from "@sentry/nextjs";
import { sentryInitOptions } from "./sentry.shared.config";

Sentry.init(sentryInitOptions);
