import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Enter your name' })
  @MaxLength(100)
  name!: string;

  @IsEmail({}, { message: 'Enter a valid email' })
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(72)
  password!: string;
}
