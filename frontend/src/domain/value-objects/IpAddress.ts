// IP Address value object
export class IpAddress {
  private readonly value: string;

  constructor(value: string) {
    if (!this.isValid(value)) {
      throw new Error('Invalid IP address');
    }
    this.value = value;
  }

  private isValid(ip: string): boolean {
    // IPv4 validation
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(ip)) {
      const parts = ip.split('.');
      return parts.every(part => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
      });
    }

    // Basic IPv6 validation
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv6Regex.test(ip);
  }

  getValue(): string {
    return this.value;
  }

  isPrivate(): boolean {
    const parts = this.value.split('.');
    if (parts.length !== 4) return false;

    const first = parseInt(parts[0], 10);
    const second = parseInt(parts[1], 10);

    // Check private IP ranges
    return (
      first === 10 ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      first === 127
    );
  }

  equals(other: IpAddress): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}