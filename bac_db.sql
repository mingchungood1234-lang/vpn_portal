-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: localhost    Database: vpnportal
-- ------------------------------------------------------
-- Server version	8.0.45-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('user','admin') DEFAULT 'user',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','$2b$10$6kqUkuo3jU7D5Pc54GU7lO6oI819QsROXhcqI6W77CEajrJus9Lqy','admin'),(2,'mingchun','$2b$10$gpneknF.terJnb3r/eYyZe/SX9iKD1uv5kRKdR0O043ak6BGXN9ve','user'),(3,'test','$2b$10$59cnTAF4G/XqXpUg4q0BauGd0lDsru.tHLYR1AA6CoJCDu3vRbG5K','user'),(4,'test1','$2b$10$PKBh6SZrdtKbfEs/WWvx1O/G8fUBTRZMA2oECpDMg.4hp/FQpaM7O','user'),(5,'test3','$2b$10$Fny4eux/P6sWgDJwBzV4z.55sgJMMyuE/SgfrEhd9zXHy0x4NFOR2','user'),(6,'testvpn','$2b$10$S68sxC6j9epq7kY9gbDYi.TmbfhNoMlFGUFXrepIPhzTZDwWNqgUG','user'),(7,'github','$2b$10$87eUY/6ga1qaUaEJnQmXzu91KFwo7fQZjOBG62uz39wOoo8hogsJe','user'),(8,'xinru','$2b$10$/djml3LOFdWYDCx5pAQOU.Yl8do0oyUH5u9Q.1p7R.PznWdJkM2y2','user');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vpn_requests`
--

DROP TABLE IF EXISTS `vpn_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vpn_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `client_name` varchar(80) NOT NULL,
  `status` enum('pending','active','failed') NOT NULL DEFAULT 'pending',
  `assigned_ip` varchar(45) DEFAULT NULL,
  `address` varchar(64) DEFAULT NULL,
  `client_public_key` text,
  `config` mediumtext,
  `config_file` varchar(255) DEFAULT NULL,
  `qr_file` varchar(255) DEFAULT NULL,
  `qr_code` mediumtext,
  `error` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_vpn_requests_user_id` (`user_id`),
  KEY `idx_vpn_requests_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vpn_requests`
--

LOCK TABLES `vpn_requests` WRITE;
/*!40000 ALTER TABLE `vpn_requests` DISABLE KEYS */;
INSERT INTO `vpn_requests` VALUES (1,2,'mc','failed',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Command failed: wg show wg0 allowed-ips: Unable to access interface: Operation not permitted','2026-05-27 07:00:02','2026-05-27 07:30:09'),(2,2,'mingchun-2','active','10.0.0.11','10.0.0.11/24','G1eQ8d6vy/HJ5g18Hwt1t2bQo/zJ/zVrF0ff8X8H5AE=','[Interface]\nAddress = 10.0.0.11/24\nPrivateKey = cINJ3zEdvftgAwzTwoX8owJ4Qbr+D7mQ5XHEVlTnbmY=\nDNS = 8.8.8.8, 8.8.4.4\n\n[Peer]\nPublicKey = aJ12BQWia9uJWOcShj1XEldhQfUjUYXojpd9YJRt30w=\nEndpoint = 35.212.244.73:51820\nAllowedIPs = 0.0.0.0/0\nPersistentKeepalive = 25\n','clients/mingchun-2.conf',NULL,NULL,NULL,'2026-05-27 07:36:06','2026-05-27 07:36:10'),(3,6,'mc','active','10.0.0.12','10.0.0.12/24','JGBmN50or20QShMUKXe4B0rHMImPh+Lz9PuysDVu7hI=','[Interface]\nAddress = 10.0.0.12/24\nPrivateKey = wBG61pHRIhDMMPXfmk0abZUV4I5sqEOZCb04RlY8mVI=\nDNS = 8.8.8.8, 8.8.4.4\n\n[Peer]\nPublicKey = aJ12BQWia9uJWOcShj1XEldhQfUjUYXojpd9YJRt30w=\nEndpoint = 35.212.244.73:51820\nAllowedIPs = 0.0.0.0/0\nPersistentKeepalive = 25\n','clients/mc.conf','clients/mc.png','data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMMAAADDAQMAAAAFsTfpAAAABlBMVEUAAAD///+l2Z/dAAAAAnRSTlP//8i138cAAAAJcEhZcwAACxIAAAsSAdLdfvwAAAOPSURBVFiF7Zi9jeMwEIVHYMDMaoAA22CmlqQG9NOA3BIztkGADUgZA0Jzb2wv9i7YAzxO1zBgrT4DlDlv3jwu8U8v+iX/JQfRxGYncw3lsG0cXB+p05KT22z9PrgxtKnSkviecFNLopupLWy4+juTrJOwsp4syXXspsq75ZX8/TMyB7+HshIt+Fbkjwi3pWayZretq220bfnenbeJ1Ce5f95/Ve5dgpcsxVJqGvKUzP1bVW+TI7h5aB3TjD1gJ4X6emoFOfGZ/DFgU6mPbYm5j5615CJHoRxkjiF3yd2sP6uecPL3is4ojJ2I/rCoduvVJDYi3oluIY9EXTXr8KqPipSLcM912Iya+2QOazYtwU9HTbaKX1+2hGsicr2akNkH8QCuWAF76XebJy258JnyDfKJeaquq2i75x5oyBnNHvLNtokzBTw72tefepJnqIb9JntJY8jf67xPLlsgli5CRAQZXnAF/KknebRmtWUdWp/K06RPLREhMySDsjQ41hZptH7TEq64QdhLqOYW2hxg9i9dK8gVIG2sg/ZFw+GdZWhoyckoNXrObxHjEQJH8dukJQfBqAxHf0ZMHt7QgsNrdxTkFKWUNeT5MX+g7lEMVUku1DbSVA0UJJMn4ZFp0pLDYuDwJrrGhcekhcBPLYEHHwMcBX0scj6k5z4gTF2UmDM+rHSp8HuECyW5grksbuON2YjbCAV50RJGNuHcVdRHDG8NNCMIaMkhJUIKw2yEGB/GXF8drCEWK2ApTDA8tcPewlMnLblE156TZIE5OMJ1dB8QCBCR06zylXJHqV9ZTEPOBM9DdG0T0mstW8T0+Eoo7xNksXlA5JQccRDiSUFmuWsJXhfiSZD4SRajDKb1fGoNuQJyYp4tRhnmBlIPjDmrCYLYSoiuCOke1/wUkZpUmiIGrEgbvgL5TJKktITLZcWxdhIxzkFccFIT7B9OJNHA//rEEk/iy10U5AoQcllxIglyG8XpK6vJmfIYCmYOzhAo0Shp0agJfO5kKQ7m2CWtXDgV1hIEYeiaAtwUb4w1OMJzHR3BYQJZAMJBNkG7lI2p15JHz0nwxCDCeOxZ4gBryfnQC+Sz4kgdyibFcZ2awOdEMjJvUZwboWnM/QOC4fNwYjg9Ohg6yssHBPW5BdfXgtMJIa2kr3SrIAwNos8w/DPOmgsylG1qgvqMhPaVE8AiwaeJ/2nJz/93+SU/kz+3f75/qJQgTwAAAABJRU5ErkJggg==',NULL,'2026-05-27 07:54:25','2026-05-27 07:54:31'),(4,8,'xinru','active','10.0.0.13','10.0.0.13/24','ikx9wiLy4HJUGVLeTLjtrBV9ENVpdyfh+szx6J7xfWg=','[Interface]\nAddress = 10.0.0.13/24\nPrivateKey = 2PzDxJLjoyCnknFjV9WfSWmR9V50ak9MjwZ0Hxv8e2Q=\nDNS = 8.8.8.8, 8.8.4.4\n\n[Peer]\nPublicKey = aJ12BQWia9uJWOcShj1XEldhQfUjUYXojpd9YJRt30w=\nEndpoint = 35.212.244.73:51820\nAllowedIPs = 0.0.0.0/0\nPersistentKeepalive = 25\n','clients/xinru.conf','clients/xinru.png','data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMMAAADDAQMAAAAFsTfpAAAABlBMVEUAAAD///+l2Z/dAAAAAnRSTlP//8i138cAAAAJcEhZcwAACxIAAAsSAdLdfvwAAAOXSURBVFiF7ZdLrqMwEEULMfCMbADJ22DmLcEGQthA2JJnbAOJDcDMA0T1qU6ennrQLaXetKNEQj4omPrcuhb920f+k3+SXaQXqUp8dPEo521Zb1kqLzn07EPc09l051BkXHReWPSS3PZBGqn3TsZyDrm9LTL8iOgeVvZb5XYo2/wzMmpNCI8sDQ8MPyPKq+uc13E5x2VTbvyOzseE/AxL+8f3O3MfEz5X2B5CIM8xxydZ+q6qj8mehAXjFFGIk55jWSs3sYfUV9feysrasGyHxtlNurbp1jvfULPwSAT4HLzkyHEq7FSPwsYhpEhnL9EsfTJ+pXZQuXdt352Vn/DHay9tRckUqrveLa5OcixWiY9Q20Vu70K6ZPQSLcSgvSeplnbMqMu2d++qcpFT5LwLGnNKkqHUzxAPL9mtfCwhe2hJ+CO1ErbJTbpVUjwyeUYMKHNEq3YTVbu8OpHO8lMVrmv1EnR9pGRCK9JKWm8KUTfZQ40+VSbGbZ/ivJD2t1Y5yJHPJrSNFRGtHHdZh7zNXkIIFZXS84bAL9bB907dhCiO2bSTZc0mM/e0Dl6yy3YF1kg4AdApb4zcyUuQz0q3yUaZMNBIUS8v5fOQvWNoE0tr5d4Szo1RveSwmUPXIir0B6mup+VLXT4nu7UI+60fgflDdGm4964dRItUuabnTFC7qCifvOa2iyxxLlZ6s1qB31Snpa285ArU9XZZXOk8ypDyeWmVhzAJ97RWRPH3CDoyd73r2kH4NR0FyGbjM+gT6fqaJR5SLBtzYY6ZQveW8C+9/pxcQe4JC4C/29jynlCa8+Yl5inwm4wy3GvZprw26UvFPidkuLHhEx9pZRA1aXuGdfSS3zvl77En9ZyJaDuWd885iCoawBoeZzUvVuIe3p7CQeg5XZj8eqWNLPWJztvUSy5pm4TZxP5brzyY4d3LJ/pIjVBNOESGpCAt+OsvTfycHCq3gh5YDCRZohhE6iWKMpWVhHMIuxJTiA7eJi85lhX/hVxdREIiL6HlPdEdZJf4JCeKSpGl8+UWRy9RPSuzh4RBrIjwAvLubRdhBKkJ1XLiU4hrRYy9BEVHV9B4ntCEl7rI6CV2nuPtMU3Bzjc95aMvZ+cidnLFsFOPnNQ5IFKP8fgBuaeaxn0EJiRiwCh7zR8vEXt7EbZMz23mp9xEsRJMSA5hEdeDF8PGuolNacSP90ZaArx+dO+TnoP87fOf/Iv8AhYQH3UAsrq8AAAAAElFTkSuQmCC',NULL,'2026-05-27 14:33:04','2026-05-27 14:33:07');
/*!40000 ALTER TABLE `vpn_requests` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-28 15:53:28
