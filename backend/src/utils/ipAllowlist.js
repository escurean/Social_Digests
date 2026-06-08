import { isIPv4 } from 'net'

// Safaricom Daraja production IP ranges — verify latest at https://developer.safaricom.co.ke
const SAFARICOM_IPS = [
  '196.201.214.0/24',
  '196.201.214.100',
  '196.201.214.101',
  '196.201.214.102',
  '196.201.214.103',
  '196.201.214.104',
  '196.201.214.113',
  '196.201.214.114',
  '196.201.214.115',
  '196.201.214.200',
  '196.201.214.206',
  '196.201.214.207',
  '196.201.214.208',
  '196.201.214.209',
  '196.201.214.210',
  '196.201.214.211',
  '196.201.214.212',
  '196.201.214.213',
  '196.201.214.214',
  '196.201.214.215',
  '196.201.214.216',
  '196.201.214.217',
  '196.201.214.218',
]

function ipToInt(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
}

export function isAllowedSafaricomIP(ip) {
  if (!ip) return false
  const cleanIp = ip.startsWith('::ffff:') ? ip.slice(7) : ip
  if (!isIPv4(cleanIp)) return false

  const clientInt = ipToInt(cleanIp)

  return SAFARICOM_IPS.some((entry) => {
    if (entry.includes('/')) {
      const [network, bits] = entry.split('/')
      const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1) >>> 0
      return (clientInt & mask) === (ipToInt(network) & mask)
    }
    return cleanIp === entry
  })
}
