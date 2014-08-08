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

 Date: 08/07/2014 11:29:37 AM
*/

-- ----------------------------
--  Table structure for eo1_ali
-- ----------------------------
DROP TABLE IF EXISTS "public"."eo1_ali";
CREATE TABLE "public"."eo1_ali" (
	"id" int8,
	"scene" text COLLATE "default",
	"date" date,
	"center_lat" float4,
	"center_lon" float4,
	"geom" "public"."geometry"
)
WITH (OIDS=FALSE);
ALTER TABLE "public"."eo1_ali" OWNER TO "osm_admin";

-- ----------------------------
--  Indexes structure for table eo1_ali
-- ----------------------------
CREATE INDEX  "eo1_ali_spatial_index" ON "public"."eo1_ali" USING gist(geom);
CREATE INDEX  "eo1_scene_index" ON "public"."eo1_ali" USING btree(scene COLLATE "default" ASC NULLS LAST);

