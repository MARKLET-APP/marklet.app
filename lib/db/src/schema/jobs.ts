import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  posterId: integer("poster_id").notNull(),
  title: text("title").notNull(),
  subCategory: text("sub_category").notNull(), // وظيفة شاغرة | طلب توظيف
  company: text("company"),
  salary: text("salary"),
  jobType: text("job_type"), // دوام كامل | جزئي | عن بعد | عقد
  experience: text("experience"), // بدون خبرة | 1-3 سنوات | 3-5 سنوات | +5 سنوات
  field: text("field"), // مجال العمل
  province: text("province").notNull(),
  city: text("city").notNull(),
  phone: text("phone"),
  description: text("description"),
  requirements: text("requirements"),
  cvUrl: text("cv_url"),
  salaryCurrency: text("salary_currency").default("USD"),
  status: text("status").notNull().default("active"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  viewCount: integer("view_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({
  id: true, createdAt: true, updatedAt: true, viewCount: true,
});

export type Job = typeof jobsTable.$inferSelect;
export type NewJob = typeof jobsTable.$inferInsert;
export type InsertJob = z.infer<typeof insertJobSchema>;
