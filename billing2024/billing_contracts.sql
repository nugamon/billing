-- MySQL dump 10.13  Distrib 8.0.40, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: billing
-- ------------------------------------------------------
-- Server version	9.1.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `contracts`
--

DROP TABLE IF EXISTS `contracts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contracts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `contract_number` varchar(20) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `phone` char(12) NOT NULL,
  `connection_address` varchar(255) NOT NULL,
  `registration_address` varchar(255) NOT NULL,
  `birth_date` varchar(10) NOT NULL,
  `document_type` varchar(50) NOT NULL,
  `document_series` varchar(10) NOT NULL,
  `document_number` varchar(20) NOT NULL,
  `issued_by` varchar(255) NOT NULL,
  `issue_date` varchar(10) NOT NULL,
  `contract_status` varchar(50) DEFAULT 'Ожидает подключения',
  `contract_date` varchar(10) DEFAULT NULL,
  `actual_connection_date` varchar(10) DEFAULT NULL,
  `tariff_id` int DEFAULT NULL,
  `balance` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `contract_number` (`contract_number`),
  CONSTRAINT `contracts_chk_1` CHECK ((`phone` like _utf8mb4'+7%'))
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contracts`
--

LOCK TABLES `contracts` WRITE;
/*!40000 ALTER TABLE `contracts` DISABLE KEYS */;
INSERT INTO `contracts` VALUES (1,'121701/2024','Дюдин Александр Дмитриевич','+79852487030','Коломна, Ленина, 65, 101','Коломна, Ленина, 65, 101','25.03.2005','Паспорт РФ','4619','213605','ГУ МВД РОССИИ ПО МОСКОВСКОЙ ОБЛ.','29.03.2019','Активный','17.12.2024','17.12.2024',6,10100.00),(8,'121801/2024','asd','+79999999999','sadsad','sadsda','18.12.2024','sfd','sdf','dsf','dsf','18.12.2024','Приостановлен','18.12.2024','18.12.2024',2,5000.00),(9,'121802/2024','Ромашкин Дмитрий Сергеевич','+75555555555','Луховицы, Огуречная, 52','Луховицы, Огуречная, 52','20.03.2005','Паспорт РФ','5819','526872','ГУ МВД РОССИИ ПО МОСКОВСКОЙ ОБЛ. 456-023','18.12.2024','Активный','18.12.2024','18.12.2024',1,3000.00),(21,'121803/2024','dsfsd','+78888888888','dsfds','dfsfsfd','11.11.1111','dsf','sdf','dsf','sdf','11.11.1111','Активный','18.12.2024','11.11.1111',NULL,NULL);
/*!40000 ALTER TABLE `contracts` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-12-21  0:03:24
