CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"npwp" text NOT NULL,
	"address" text,
	"city" text,
	"province" text,
	"postal_code" text,
	"phone" text,
	"email" text,
	"logo_url" text,
	"jkk_risk_level" numeric(4, 2) DEFAULT '0.24',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_number" text NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"nik" text NOT NULL,
	"npwp" text,
	"ptkp_status" text DEFAULT 'TK/0' NOT NULL,
	"bpjs_kesehatan_number" text,
	"bpjs_ketenagakerjaan_number" text,
	"join_date" date NOT NULL,
	"department" text,
	"position" text,
	"employment_type" text DEFAULT 'permanent',
	"bank_name" text,
	"bank_account_number" text,
	"bank_account_name" text,
	"address" text,
	"city" text,
	"province" text,
	"postal_code" text,
	"status" text DEFAULT 'active',
	"termination_date" date,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "employees_employee_number_unique" UNIQUE("employee_number"),
	CONSTRAINT "employees_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"amount" numeric(15, 2) NOT NULL,
	"category" text NOT NULL,
	"expense_date" date NOT NULL,
	"receipt_url" text,
	"status" text DEFAULT 'pending',
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"payslip_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'employee' NOT NULL,
	"token" text NOT NULL,
	"status" text DEFAULT 'pending',
	"invited_by" uuid NOT NULL,
	"accepted_by" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "payroll_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_month" integer NOT NULL,
	"period_year" integer NOT NULL,
	"status" text DEFAULT 'draft',
	"total_gross" numeric(15, 2),
	"total_deductions" numeric(15, 2),
	"total_net" numeric(15, 2),
	"total_pph21" numeric(15, 2),
	"total_bpjs_employee" numeric(15, 2),
	"total_bpjs_employer" numeric(15, 2),
	"notes" text,
	"calculated_at" timestamp with time zone,
	"calculated_by" uuid,
	"approved_at" timestamp with time zone,
	"approved_by" uuid,
	"paid_at" timestamp with time zone,
	"paid_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payslips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"gaji_pokok" numeric(15, 2) NOT NULL,
	"tunjangan_transport" numeric(15, 2) DEFAULT '0',
	"tunjangan_makan" numeric(15, 2) DEFAULT '0',
	"tunjangan_komunikasi" numeric(15, 2) DEFAULT '0',
	"tunjangan_jabatan" numeric(15, 2) DEFAULT '0',
	"tunjangan_lainnya" numeric(15, 2) DEFAULT '0',
	"bonus" numeric(15, 2) DEFAULT '0',
	"overtime" numeric(15, 2) DEFAULT '0',
	"reimbursements" numeric(15, 2) DEFAULT '0',
	"gross_salary" numeric(15, 2) NOT NULL,
	"bpjs_kesehatan_employee" numeric(15, 2) NOT NULL,
	"bpjs_jht_employee" numeric(15, 2) NOT NULL,
	"bpjs_jp_employee" numeric(15, 2) NOT NULL,
	"bpjs_kesehatan_employer" numeric(15, 2) NOT NULL,
	"bpjs_jht_employer" numeric(15, 2) NOT NULL,
	"bpjs_jp_employer" numeric(15, 2) NOT NULL,
	"bpjs_jkk_employer" numeric(15, 2) NOT NULL,
	"bpjs_jkm_employer" numeric(15, 2) NOT NULL,
	"pph21" numeric(15, 2) NOT NULL,
	"ptkp_status" text NOT NULL,
	"other_deductions" numeric(15, 2) DEFAULT '0',
	"deduction_notes" text,
	"total_deductions" numeric(15, 2) NOT NULL,
	"net_salary" numeric(15, 2) NOT NULL,
	"pdf_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "refresh_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "salary_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"gaji_pokok" numeric(15, 2) NOT NULL,
	"tunjangan_transport" numeric(15, 2) DEFAULT '0',
	"tunjangan_makan" numeric(15, 2) DEFAULT '0',
	"tunjangan_komunikasi" numeric(15, 2) DEFAULT '0',
	"tunjangan_jabatan" numeric(15, 2) DEFAULT '0',
	"tunjangan_lainnya" numeric(15, 2) DEFAULT '0',
	"effective_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text NOT NULL,
	"employee_id" uuid,
	"is_active" boolean DEFAULT true,
	"last_login" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_payslip_id_payslips_id_fk" FOREIGN KEY ("payslip_id") REFERENCES "public"."payslips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_accepted_by_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_calculated_by_users_id_fk" FOREIGN KEY ("calculated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_components" ADD CONSTRAINT "salary_components_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_log_entity" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_employees_status" ON "employees" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_expenses_employee" ON "expenses" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_expenses_status" ON "expenses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_payroll_runs_period" ON "payroll_runs" USING btree ("period_year","period_month");--> statement-breakpoint
CREATE INDEX "idx_payslips_employee" ON "payslips" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "idx_payslips_payroll_run" ON "payslips" USING btree ("payroll_run_id");