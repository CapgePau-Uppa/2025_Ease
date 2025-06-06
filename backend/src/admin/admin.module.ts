import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { DatabaseModule } from "../database/database.module";
import { UsersModule } from "../users/users.module";
import { AuthModule } from "../auth/auth.module";
import { APP_GUARD } from "@nestjs/core";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AdminService } from "./admin.service";

@Module({
  imports: [
    UsersModule,
    AuthModule,
    DatabaseModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule { }
