/*
 Navicat Premium Data Transfer

 Source Server         : AWS MENA
 Source Server Type    : PostgreSQL
 Source Server Version : 90303
 Source Host           : osmdb.crcholi0be4z.us-east-1.rds.amazonaws.com
 Source Database       : osmdb
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : 90303
 File Encoding         : utf-8

 Date: 08/07/2014 11:29:51 AM
*/

-- ----------------------------
--  Table structure for l8
-- ----------------------------
DROP TABLE IF EXISTS "public"."l8";
CREATE TABLE "public"."l8" (
	"id" int8,
	"scene" text COLLATE "default",
	"date" date,
	"center_lat" float4,
	"center_lon" float4,
	"geom" "public"."geometry"
)
WITH (OIDS=FALSE);
ALTER TABLE "public"."l8" OWNER TO "osm_admin";

-- ----------------------------
--  Indexes structure for table l8
-- ----------------------------
CREATE INDEX  "l8_scene_index" ON "public"."l8" USING btree(scene COLLATE "default" ASC NULLS LAST);
CREATE INDEX  "l8_spatial_index" ON "public"."l8" USING gist(geom);

