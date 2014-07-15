/*
 Navicat Premium Data Transfer

 Source Server         : localhost:5432
 Source Server Type    : PostgreSQL
 Source Server Version : 90303
 Source Host           : localhost
 Source Database       : dk
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : 90303
 File Encoding         : utf-8

 Date: 07/15/2014 16:47:38 PM
*/

-- ----------------------------
--  Sequence structure for app_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."app_seq";
CREATE SEQUENCE "public"."app_seq" INCREMENT 1 START 4 MAXVALUE 9223372036854775807 MINVALUE 1 CACHE 1;
ALTER TABLE "public"."app_seq" OWNER TO "osm_admin";

-- ----------------------------
--  Table structure for applications
-- ----------------------------
DROP TABLE IF EXISTS "public"."applications";
CREATE TABLE "public"."applications" (
	"id" int4 NOT NULL DEFAULT nextval('app_seq'::regclass),
	"name" text COLLATE "default",
	"description" text COLLATE "default",
	"link" text COLLATE "default",
	"icon_url" text COLLATE "default",
	"logo_url" text COLLATE "default",
	"company" text COLLATE "default",
	"secret" text COLLATE "default",
	"created_at" timestamp(6) NULL,
	"updated_at" timestamp(6) NULL,
	"status" text COLLATE "default",
	"fbappid" text COLLATE "default"
)
WITH (OIDS=FALSE);
ALTER TABLE "public"."applications" OWNER TO "osm_admin";

-- ----------------------------
--  Primary key structure for table applications
-- ----------------------------
ALTER TABLE "public"."applications" ADD PRIMARY KEY ("id") NOT DEFERRABLE INITIALLY IMMEDIATE;

