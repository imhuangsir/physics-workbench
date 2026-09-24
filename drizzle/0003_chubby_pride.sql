CREATE TABLE `uploads` (
	`key` text PRIMARY KEY NOT NULL,
	`student_id` integer NOT NULL,
	`mime` text NOT NULL,
	`data` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
