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

 Date: 07/15/2014 16:47:48 PM
*/

-- ----------------------------
--  Sequence structure for id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."user_seq";
CREATE SEQUENCE "public"."user_seq" INCREMENT 1 START 4 MAXVALUE 9223372036854775807 MINVALUE 1 CACHE 1;
ALTER TABLE "public"."user_seq" OWNER TO "osm_admin";

-- ----------------------------
--  Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS "public"."users";
CREATE TABLE "public"."users" (
	"id" int4 NOT NULL DEFAULT nextval('user_seq'::regclass),
	"name" varchar NOT NULL COLLATE "default",
	"email" varchar COLLATE "default",
	"organization" varchar COLLATE "default",
	"created_at" timestamp(6) NULL,
	"updated_at" timestamp(6) NULL,
	"is_admin" bool,
	"is_banned" bool,
	"gravatar" varchar COLLATE "default",
	"cat_src" varchar COLLATE "default",
	"latitude" float4,
	"longitude" float4,
	"lang" varchar COLLATE "default",
	"region" varchar COLLATE "default"
)
WITH (OIDS=FALSE);
ALTER TABLE "public"."users" OWNER TO "osm_admin";

-- ----------------------------
--  Primary key structure for table users
-- ----------------------------
ALTER TABLE "public"."users" ADD PRIMARY KEY ("id") NOT DEFERRABLE INITIALLY IMMEDIATE;

