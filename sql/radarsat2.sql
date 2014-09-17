-- ----------------------------
--  Sequence structure for radarsat2_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."radarsat2_seq";
CREATE SEQUENCE "public"."radarsat2_seq" INCREMENT 1 START 3 MAXVALUE 9223372036854775807 MINVALUE 1 CACHE 1;
ALTER TABLE "public"."radarsat2_seq" OWNER TO "osm_admin";

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

