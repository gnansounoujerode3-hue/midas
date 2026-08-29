package bj.midas.wallet

/**
 * Commandes observées dans le journal HCI de l'AMIS Watch5GTR avec RDFit.
 * Elles ne couvrent volontairement que les mesures et la fonction localiser.
 * Aucune commande de réinitialisation, d'heure ou de configuration n'est envoyée.
 */
object RdfitProtocol {
    const val WRITE_UUID = "6e40ab02-b5a3-f393-e0a9-e50e24dcca9e"

    val heartRateRequest = bytes("ED40007F00040A200101")
    val spo2Request = bytes("ED4000BB00040A200201")
    val bloodPressureRequest = bytes("ED40002800040A200301")
    val findWatchRequest = bytes("ED40004800020401")

    data class Measurement(val type: String, val label: String, val value: String, val unit: String)

    fun decode(packet: ByteArray): Measurement? {
        // Les trames observées ont la forme … 0A 0A <bpm>, 0A 0D <spo2>, 0A 0C <sys> <dia>.
        for (i in 0 until packet.size - 2) {
            if (packet[i] != 0x0A.toByte()) continue
            when (packet[i + 1].toInt() and 0xFF) {
                0x0A -> return Measurement("heart_rate", "Fréquence cardiaque", (packet[i + 2].toInt() and 0xFF).toString(), "bpm")
                0x0D -> return Measurement("spo2", "Saturation en oxygène", (packet[i + 2].toInt() and 0xFF).toString(), "%")
                0x0C -> if (i + 3 < packet.size) return Measurement("blood_pressure", "Tension estimée", "${packet[i + 2].toInt() and 0xFF}/${packet[i + 3].toInt() and 0xFF}", "mmHg")
            }
        }
        return null
    }

    private fun bytes(hex: String): ByteArray = hex.chunked(2).map { it.toInt(16).toByte() }.toByteArray()
}
