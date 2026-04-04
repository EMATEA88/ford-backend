export function isWithdrawalWindowOpen(date = new Date()) {
  const day = date.getDay() // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  const hour = date.getHours()
  const minute = date.getMinutes()

  const isWeekdayAllowed = day >= 1 && day <= 4 // Seg → Qui
  const isHourAllowed =
    hour > 9 && hour < 18 ||
    (hour === 9 && minute >= 0) ||
    (hour === 17 && minute <= 59)

  return isWeekdayAllowed && isHourAllowed
}
