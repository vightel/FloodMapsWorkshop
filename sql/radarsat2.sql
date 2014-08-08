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

 Date: 08/07/2014 11:21:00 AM
*/

-- ----------------------------
--  Table structure for radarsat2
-- ----------------------------
DROP TABLE IF EXISTS "public"."radarsat2";
CREATE TABLE "public"."radarsat2" (
	"id" int8 DEFAULT nextval('radarsat2_seq'::regclass),
	"scene" text NOT NULL COLLATE "default",
	"date" date,
	"center_lat" float4,
	"center_lon" float4,
	"geom" "public"."geometry"
)
WITH (OIDS=FALSE);
ALTER TABLE "public"."radarsat2" OWNER TO "osm_admin";

-- ----------------------------
--  Primary key structure for table radarsat2
-- ----------------------------
ALTER TABLE "public"."radarsat2" ADD PRIMARY KEY ("scene") NOT DEFERRABLE INITIALLY IMMEDIATE;

-- ----------------------------
--  Indexes structure for table radarsat2
-- ----------------------------
CREATE INDEX  "radarsat2_spatial_index" ON "public"."radarsat2" USING gist(geom);

