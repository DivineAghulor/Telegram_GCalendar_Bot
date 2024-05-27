function convertToDatetime(dateStr, timeStr) {
    // Split the date string into day, month, and year
    const [day, month, year] = dateStr.split('-').map(part => parseInt(part, 10));
    
    // Split the time string into hours and minutes
    const [hours, minutes] = timeStr.split('-').map(part => parseInt(part, 10));
    
    // Create a Date object (assuming UTC for simplicity)
    const date = new Date(Date.UTC(2000 + year, month - 1, day, hours, minutes));
    
    // Convert to ISO 8601 string format (YYYY-MM-DDTHH:mm:ss.sssZ)
    const isoString = date.toISOString();
    
    return isoString;
  }
  
//   // Example usage:
//   const dateStr = "27-05-24";
//   const timeStr = "14-30";
//   const googleCalendarDatetime = convertToGoogleCalendarDatetime(dateStr, timeStr);
  
//   console.log(googleCalendarDatetime); // "2024-05-27T14:30:00.000Z"

  
export {convertToDatetime};