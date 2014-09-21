-- ----------------------------
--  Sequence structure for dfo_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."dfo_seq";
CREATE SEQUENCE "public"."dfo_seq" INCREMENT 1 START 3 MAXVALUE 9223372036854775807 MINVALUE 1 CACHE 1;

-- ----------------------------
--  Table structure for dfo
-- ----------------------------
DROP TABLE IF EXISTS "public"."dfo";
CREATE TABLE "public"."dfo" (
	"id" int8 DEFAULT nextval('dfo_seq'::regclass),
	"scene" text NOT NULL COLLATE "default",
	"date" date,
	"center_lat" float4,
	"center_lon" float4,
	"geom" "public"."geometry"
)
WITH (OIDS=FALSE);

-- ----------------------------
--  Primary key structure for table dfo
-- ----------------------------
ALTER TABLE "public"."dfo" ADD PRIMARY KEY ("scene") NOT DEFERRABLE INITIALLY IMMEDIATE;

-- ----------------------------
--  Indexes structure for table dfo
-- ----------------------------
CREATE INDEX  "dfo_spatial_index" ON "public"."dfo" USING gist(geom);
