import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(2),
  businessSector: z.string().min(2),
  vatNumber: z.string().optional().or(z.literal('')),
  address: z.string().min(2),
  phone: z.string().min(6),
  products: z.array(z.string().min(1)).default([]),
  customProducts: z.string().default('')
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const profileSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6).optional().or(z.literal('')),
  notificationPreferences: z.string().default('{}')
});

export const companySchema = z.object({
  companyName: z.string().min(2),
  businessSector: z.string().min(2),
  vatNumber: z.string().optional().or(z.literal('')),
  address: z.string().min(2),
  phone: z.string().min(6),
  email: z.string().email(),
  products: z.array(z.string().min(1)).default([]),
  customProducts: z.string().default('')
});

export const forgotPasswordSchema = z.object({
  email: z.string().email()
});

export const crawlerSchema = z.object({
  maxPages: z.number().int().min(1).max(50).default(10),
  pageSize: z.number().int().min(10).max(200).default(100)
});

export const pdfExtractSchema = z.object({
  url: z.string().url(),
  fileName: z.string().optional()
});

export const notificationJobSchema = z.object({
  notifyUrgentOnly: z.boolean().default(true)
});