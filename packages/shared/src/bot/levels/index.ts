import type { BotLevel, Policy } from '../types';
import { easy } from './easy';
import { medium } from './medium';
import { hard } from './hard';

export const POLICIES: Record<BotLevel, Policy> = { easy, medium, hard };
